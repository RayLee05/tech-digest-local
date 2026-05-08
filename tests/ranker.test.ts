// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { RawArticle } from "../src/shared/types.js";
import { DefaultRanker, inferCategory } from "../src/server/ranking/defaultRanker.js";

function article(overrides: Partial<RawArticle>): RawArticle {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "OpenAI launches new model",
    originalUrl: overrides.originalUrl ?? `https://example.com/${crypto.randomUUID()}`,
    sourceName: overrides.sourceName ?? "Example",
    sourceUrl: overrides.sourceUrl ?? "https://example.com/feed",
    sourceWeight: overrides.sourceWeight ?? 1,
    categoryHint: overrides.categoryHint,
    language: "en",
    publishedAt: overrides.publishedAt ?? new Date().toISOString(),
    fetchedAt: overrides.fetchedAt ?? new Date().toISOString(),
    summary: overrides.summary,
    content: overrides.content,
    imageUrl: overrides.imageUrl
  };
}

describe("DefaultRanker", () => {
  it("prioritizes weighted AI and chip news", () => {
    const ranker = new DefaultRanker();
    const ranked = ranker.rankArticles(
      [
        article({ title: "Small app update", categoryHint: "internet", sourceWeight: 0.8 }),
        article({ title: "NVIDIA unveils Blackwell GPU supply update", categoryHint: "chips", sourceWeight: 1.2 }),
        article({ title: "OpenAI releases GPT agent platform", categoryHint: "ai", sourceWeight: 1.2 })
      ],
      2
    );

    expect(ranked).toHaveLength(2);
    expect(ranked.map((item) => item.categoryHint)).toEqual(["ai", "chips"]);
  });

  it("deduplicates identical URLs", () => {
    const ranker = new DefaultRanker();
    const originalUrl = "https://example.com/story";
    const ranked = ranker.rankArticles(
      [
        article({ originalUrl, title: "OpenAI releases GPT agent platform" }),
        article({ originalUrl, title: "OpenAI releases GPT agent platform" })
      ],
      10
    );

    expect(ranked).toHaveLength(1);
  });
});

describe("inferCategory", () => {
  it("detects chip stories from text", () => {
    expect(inferCategory(article({ title: "TSMC expands advanced chip capacity" }))).toBe("chips");
  });
});
