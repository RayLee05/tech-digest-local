import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { existsSync } from "node:fs";
import path from "node:path";
import type { SourceConfig, SourceStatus } from "../shared/types.js";
import type { AppEnv } from "./config/env.js";
import type { StorageProvider } from "./interfaces.js";
import type { DigestJobRunner } from "./jobs/digestJob.js";

interface AppContext {
  env: AppEnv;
  sources: SourceConfig[];
  storage: StorageProvider;
  jobRunner: DigestJobRunner;
  summaryProviderName: string;
  version: string;
}

export async function createApp(context: AppContext): Promise<FastifyInstance> {
  const app = Fastify({
    logger: context.env.NODE_ENV === "development"
  });

  await app.register(cors, {
    origin: context.env.NODE_ENV === "development"
  });

  app.get("/api/health", async () => ({
    ok: true,
    version: context.version,
    timezone: context.env.TIMEZONE,
    model: context.summaryProviderName,
    storage: context.storage.location
  }));

  app.get("/api/digests/latest", async () => ({
    digest: context.storage.getLatestDigest(),
    sources: getMergedSourceStatuses(context.sources, context.storage)
  }));

  app.get<{ Params: { date: string } }>("/api/digests/:date", async (request, reply) => {
    const { date } = request.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply.code(400).send({ error: "Invalid date format. Expected YYYY-MM-DD." });
    }
    return {
      digest: context.storage.getDigest(date),
      sources: getMergedSourceStatuses(context.sources, context.storage)
    };
  });

  app.get("/api/sources", async () => getMergedSourceStatuses(context.sources, context.storage));

  app.post("/api/jobs/run", async (request, reply) => {
    try {
      return await context.jobRunner.run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already running")) {
        return reply.code(409).send({ error: message });
      }
      request.log.error(error);
      return reply.code(500).send({ error: message });
    }
  });

  const clientRoot = path.resolve("dist/client");
  if (context.env.NODE_ENV === "production" && existsSync(clientRoot)) {
    await app.register(fastifyStatic, {
      root: clientRoot,
      prefix: "/"
    });

    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.code(404).send({ error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  return app;
}

function getMergedSourceStatuses(sources: SourceConfig[], storage: StorageProvider): SourceStatus[] {
  const stored = new Map(storage.getSourceStatuses().map((status) => [status.sourceName, status]));
  return sources.map((source) => {
    const existing = stored.get(source.name);
    if (existing) {
      return existing;
    }
    return {
      sourceName: source.name,
      url: source.url,
      enabled: source.enabled !== false,
      status: "idle",
      itemCount: 0
    };
  });
}
