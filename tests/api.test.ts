// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/server/app.js";
import { loadEnv } from "../src/server/config/env.js";
import type { DigestJobRunner } from "../src/server/jobs/digestJob.js";
import { SqliteStorage } from "../src/server/storage/sqlite.js";

let tempDir: string | null = null;

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe("API", () => {
  it("returns health and empty latest digest", async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "tech-digest-"));
    const env = loadEnv({
      NODE_ENV: "test",
      APP_PORT: 3001,
      DATABASE_PATH: path.join(tempDir, "test.sqlite")
    });
    const storage = new SqliteStorage(env.DATABASE_PATH);
    storage.init();

    const app = await createApp({
      env,
      sources: [
        {
          name: "Example",
          url: "https://example.com/feed",
          enabled: true
        }
      ],
      storage,
      jobRunner: {
        run: vi.fn()
      } as unknown as DigestJobRunner,
      summaryProviderName: "heuristic-local",
      version: "test"
    });

    const health = await app.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ ok: true, version: "test" });

    const latest = await app.inject({ method: "GET", url: "/api/digests/latest" });
    expect(latest.statusCode).toBe(200);
    expect(latest.json()).toMatchObject({
      digest: null,
      sources: [{ sourceName: "Example", status: "idle" }]
    });

    await app.close();
    storage.close();
  });
});
