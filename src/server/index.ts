import { readFileSync } from "node:fs";
import path from "node:path";
import { RssSourceAdapter } from "./adapters/rss.js";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { loadSources } from "./config/sources.js";
import { DigestJobRunner } from "./jobs/digestJob.js";
import { startScheduler } from "./jobs/scheduler.js";
import { createSummaryProvider } from "./providers/factory.js";
import { NoopNotificationProvider } from "./providers/noopNotificationProvider.js";
import { DefaultRanker } from "./ranking/defaultRanker.js";
import { SqliteStorage } from "./storage/sqlite.js";

const env = loadEnv();
const packageJson = JSON.parse(readFileSync(path.resolve("package.json"), "utf8")) as { version?: string };
const sources = loadSources(env.SOURCES_FILE);
const storage = new SqliteStorage(env.DATABASE_PATH);
storage.init();
const summaryProvider = createSummaryProvider(env);

const jobRunner = new DigestJobRunner({
  env,
  sources,
  sourceAdapter: new RssSourceAdapter(),
  storage,
  ranker: new DefaultRanker(),
  summaryProvider,
  notificationProvider: new NoopNotificationProvider()
});

const app = await createApp({
  env,
  sources,
  storage,
  jobRunner,
  summaryProviderName: summaryProvider.name,
  version: packageJson.version ?? "0.0.0"
});

startScheduler(env, jobRunner);

if (env.RUN_ON_START) {
  jobRunner.run().catch((error) => {
    app.log.error(error, "Startup digest job failed");
  });
}

const address = await app.listen({
  host: env.APP_HOST,
  port: env.APP_PORT
});

console.log(`Tech Digest is running at ${address}`);

const shutdown = async () => {
  await app.close();
  storage.close();
};

process.on("SIGINT", () => {
  shutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  shutdown().finally(() => process.exit(0));
});
