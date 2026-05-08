import { z } from "zod";
import type { DigestItem } from "../../shared/types.js";
import type { SummaryInput, SummaryProvider } from "../interfaces.js";
import { inferCategory } from "../ranking/defaultRanker.js";
import { stableHash } from "../utils/hash.js";

const compatibleItemSchema = z.object({
  originalUrl: z.string().url(),
  title: z.string().min(1),
  summaryZh: z.string().min(1),
  category: z.enum(["ai", "robotics", "chips", "internet", "bigtech", "research", "business", "policy", "other"]),
  importanceScore: z.number().min(1).max(100),
  importanceReason: z.string().min(1)
});

const compatibleResponseSchema = z.object({
  items: z.array(compatibleItemSchema)
});

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class OpenAiCompatibleSummaryProvider implements SummaryProvider {
  readonly name: string;
  private apiKey: string;
  private endpoint: string;
  private model: string;

  constructor(options: { apiKey: string; baseUrl: string; model: string }) {
    this.apiKey = options.apiKey;
    this.endpoint = toChatCompletionsEndpoint(options.baseUrl);
    this.model = options.model;
    this.name = `openai-compatible:${options.model}`;
  }

  async generateDigestItems(input: SummaryInput): Promise<DigestItem[]> {
    const payload = input.articles.map((article) => ({
      title: article.title,
      originalUrl: article.originalUrl,
      sourceName: article.sourceName,
      sourceWeight: article.sourceWeight,
      categoryHint: article.categoryHint,
      language: article.language,
      publishedAt: article.publishedAt,
      summary: article.summary,
      content: article.content?.slice(0, 1200)
    }));

    const json = await this.callChatCompletions({
      digestDate: input.digestDate,
      topN: input.topN,
      articles: payload
    });

    const parsed = compatibleResponseSchema.parse(JSON.parse(extractJsonObject(json)));
    const articlesByUrl = new Map(input.articles.map((article) => [article.originalUrl, article]));

    return parsed.items.flatMap((item): DigestItem[] => {
      const article = articlesByUrl.get(item.originalUrl);
      if (!article) {
        return [];
      }
      return [
        {
          id: stableHash(`${input.digestDate}:${article.originalUrl}`),
          title: item.title || article.title,
          summaryZh: item.summaryZh,
          category: item.category || inferCategory(article),
          importanceScore: item.importanceScore,
          importanceReason: item.importanceReason,
          sourceName: article.sourceName,
          sourceUrl: article.sourceUrl,
          publishedAt: article.publishedAt,
          imageUrl: article.imageUrl,
          originalUrl: article.originalUrl
        }
      ];
    });
  }

  private async callChatCompletions(payload: unknown): Promise<string> {
    const body = {
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            'You are a careful Chinese technology digest editor. Output only valid json in this exact shape: {"items":[{"originalUrl":"https://example.com","title":"string","summaryZh":"中文摘要","category":"ai","importanceScore":90,"importanceReason":"string"}]}. Rank by industry impact, source reliability, freshness, and category weight. Do not invent facts.'
        },
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 4096
    };

    const first = await this.post(body);
    if (first.ok) {
      return first.content;
    }

    const fallbackBody = { ...body, response_format: undefined };
    const fallback = await this.post(fallbackBody);
    if (fallback.ok) {
      return fallback.content;
    }

    throw new Error(first.error ?? fallback.error ?? "OpenAI-compatible provider failed");
  }

  private async post(body: Record<string, unknown>): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const json = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
    if (!response.ok) {
      return {
        ok: false,
        error: json?.error?.message ?? `${response.status} ${response.statusText}`
      };
    }

    const content = json?.choices?.[0]?.message?.content;
    if (!content) {
      return {
        ok: false,
        error: "Provider returned empty message content"
      };
    }

    return { ok: true, content };
  }
}

function toChatCompletionsEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`;
}

function extractJsonObject(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}
