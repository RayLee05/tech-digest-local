import { parse } from "node-html-parser";
import RSSParser from "rss-parser";
import type { RawArticle, SourceConfig } from "../../shared/types.js";
import type { SourceAdapter } from "../interfaces.js";
import { normalizeUrl, stableHash } from "../utils/hash.js";

type RssItem = {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  enclosure?: { url?: string; type?: string };
  "content:encoded"?: string;
  "media:content"?: { $?: { url?: string; medium?: string; type?: string } } | Array<{ $?: { url?: string } }>;
  "media:thumbnail"?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
};

const parser = new RSSParser<unknown, RssItem>({
  customFields: {
    item: ["content:encoded", "media:content", "media:thumbnail"]
  },
  timeout: 15000
});

export class RssSourceAdapter implements SourceAdapter {
  async fetch(source: SourceConfig): Promise<RawArticle[]> {
    const feed = await parser.parseURL(source.url);
    const fetchedAt = new Date().toISOString();

    return feed.items
      .map((item) => normalizeRssItem(item, source, fetchedAt))
      .filter((article): article is RawArticle => article !== null);
  }
}

export function normalizeRssItem(item: RssItem, source: SourceConfig, fetchedAt: string): RawArticle | null {
  const title = cleanText(item.title ?? "");
  const url = normalizeUrl(item.link ?? item.guid ?? "");

  if (!title || !url) {
    return null;
  }

  const content = item["content:encoded"] ?? item.content;
  const summary = cleanText(item.contentSnippet ?? htmlToText(content ?? ""));
  const publishedAt = parseDate(item.isoDate ?? item.pubDate);
  const imageUrl = extractImageUrl(item, content);

  return {
    id: stableHash(url),
    title,
    originalUrl: url,
    sourceName: source.name,
    sourceUrl: source.url,
    sourceWeight: source.weight ?? 1,
    categoryHint: source.categoryHint,
    language: source.language ?? "mixed",
    publishedAt,
    fetchedAt,
    summary,
    content: content ? trimContent(htmlToText(content)) : undefined,
    imageUrl
  };
}

function parseDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/&nbsp;/g, " ").trim();
}

function htmlToText(html: string): string {
  try {
    return cleanText(parse(html).textContent);
  } catch {
    return cleanText(html.replace(/<[^>]*>/g, " "));
  }
}

function trimContent(value: string): string | undefined {
  const cleaned = cleanText(value);
  return cleaned ? cleaned.slice(0, 2000) : undefined;
}

function extractImageUrl(item: RssItem, html?: string): string | undefined {
  const enclosureUrl = item.enclosure?.url;
  if (enclosureUrl && (!item.enclosure?.type || item.enclosure.type.startsWith("image/"))) {
    return enclosureUrl;
  }

  const mediaContent = firstMediaUrl(item["media:content"]);
  if (mediaContent) {
    return mediaContent;
  }

  const mediaThumbnail = firstMediaUrl(item["media:thumbnail"]);
  if (mediaThumbnail) {
    return mediaThumbnail;
  }

  if (!html) {
    return undefined;
  }

  try {
    const root = parse(html);
    const image = root.querySelector("img");
    return image?.getAttribute("src") ?? undefined;
  } catch {
    return undefined;
  }
}

function firstMediaUrl(value: RssItem["media:content"] | RssItem["media:thumbnail"]): string | undefined {
  if (!value) {
    return undefined;
  }
  const entries = Array.isArray(value) ? value : [value];
  return entries.map((entry) => entry.$?.url).find(Boolean);
}
