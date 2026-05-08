// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Digest, RawArticle } from "../src/shared/types.js";
import { SqliteStorage } from "../src/server/storage/sqlite.js";

let tempDir: string | null = null;

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe("SqliteStorage", () => {
  it("stores and reads digests", () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "tech-digest-"));
    const storage = new SqliteStorage(path.join(tempDir, "test.sqlite"));
    storage.init();

    const digest: Digest = {
      date: "2026-05-07",
      generatedAt: "2026-05-07T00:30:00.000Z",
      model: "test",
      itemCount: 1,
      items: [
        {
          id: "item-1",
          title: "OpenAI releases a new model",
          summaryZh: "OpenAI 发布新模型。",
          category: "ai",
          importanceScore: 90,
          importanceReason: "行业影响高。",
          sourceName: "OpenAI",
          sourceUrl: "https://openai.com/news/rss.xml",
          publishedAt: "2026-05-07T00:00:00.000Z",
          originalUrl: "https://openai.com/news/example"
        }
      ]
    };

    storage.saveDigest(digest);
    expect(storage.getLatestDigest()?.items[0]?.title).toBe("OpenAI releases a new model");
    storage.close();
  });

  it("stores recent articles", () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "tech-digest-"));
    const storage = new SqliteStorage(path.join(tempDir, "test.sqlite"));
    storage.init();

    const article: RawArticle = {
      id: "article-1",
      title: "NVIDIA announces a GPU update",
      originalUrl: "https://example.com/gpu",
      sourceName: "Example",
      sourceUrl: "https://example.com/feed",
      sourceWeight: 1,
      categoryHint: "chips",
      language: "en",
      fetchedAt: "2026-05-07T00:00:00.000Z"
    };

    storage.upsertArticles([article]);
    expect(storage.getArticlesSince("2026-05-06T00:00:00.000Z")).toHaveLength(1);
    storage.close();
  });
});
