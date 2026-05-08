// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { SourceConfig } from "../src/shared/types.js";
import { normalizeRssItem } from "../src/server/adapters/rss.js";

describe("normalizeRssItem", () => {
  it("normalizes RSS items and extracts images", () => {
    const source: SourceConfig = {
      name: "Mock Source",
      url: "https://example.com/feed",
      categoryHint: "ai",
      language: "en",
      weight: 1,
      enabled: true
    };

    const article = normalizeRssItem(
      {
        title: "  OpenAI releases a new model ",
        link: "https://example.com/story?utm_source=test#section",
        isoDate: "2026-05-07T00:00:00.000Z",
        contentSnippet: "A concise update.",
        "content:encoded": "<p>A concise update.</p><img src=\"https://example.com/image.jpg\" />"
      },
      source,
      "2026-05-07T01:00:00.000Z"
    );

    expect(article).toMatchObject({
      title: "OpenAI releases a new model",
      originalUrl: "https://example.com/story",
      sourceName: "Mock Source",
      categoryHint: "ai",
      imageUrl: "https://example.com/image.jpg"
    });
  });
});
