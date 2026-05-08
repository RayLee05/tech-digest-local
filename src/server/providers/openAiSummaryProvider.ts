import OpenAI from "openai";
import { z } from "zod";
import type { DigestItem } from "../../shared/types.js";
import type { SummaryInput, SummaryProvider } from "../interfaces.js";
import { inferCategory } from "../ranking/defaultRanker.js";
import { stableHash } from "../utils/hash.js";

const modelItemSchema = z.object({
  originalUrl: z.string().url(),
  title: z.string().min(1),
  summaryZh: z.string().min(1),
  category: z.enum(["ai", "robotics", "chips", "internet", "bigtech", "research", "business", "policy", "other"]),
  importanceScore: z.number().min(1).max(100),
  importanceReason: z.string().min(1)
});

const modelResponseSchema = z.object({
  items: z.array(modelItemSchema)
});

export class OpenAiSummaryProvider implements SummaryProvider {
  readonly name: string;
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.name = `openai:${model}`;
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

    const response = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: "system",
          content:
            "You are a careful Chinese technology digest editor. Select the most important items from the candidate articles and rank by industry impact, source reliability, freshness, and category weight. Write concise Chinese summaries. Do not exaggerate or invent facts."
        },
        {
          role: "user",
          content: JSON.stringify({
            digestDate: input.digestDate,
            topN: input.topN,
            articles: payload
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "tech_digest_items",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["items"],
            properties: {
              items: {
                type: "array",
                maxItems: input.topN,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["originalUrl", "title", "summaryZh", "category", "importanceScore", "importanceReason"],
                  properties: {
                    originalUrl: { type: "string" },
                    title: { type: "string" },
                    summaryZh: { type: "string" },
                    category: {
                      type: "string",
                      enum: ["ai", "robotics", "chips", "internet", "bigtech", "research", "business", "policy", "other"]
                    },
                    importanceScore: { type: "number", minimum: 1, maximum: 100 },
                    importanceReason: { type: "string" }
                  }
                }
              }
            }
          },
          strict: true
        }
      }
    });

    const parsed = modelResponseSchema.parse(JSON.parse(response.output_text));
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
}
