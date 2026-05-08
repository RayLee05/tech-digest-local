import type { DigestItem, RawArticle } from "../../shared/types.js";
import type { SummaryInput, SummaryProvider } from "../interfaces.js";
import { inferCategory } from "../ranking/defaultRanker.js";
import { stableHash } from "../utils/hash.js";

export class HeuristicSummaryProvider implements SummaryProvider {
  readonly name = "heuristic-local";

  async generateDigestItems(input: SummaryInput): Promise<DigestItem[]> {
    return input.articles.slice(0, input.topN).map((article, index) => {
      const summary = article.summary || article.content || article.title;
      const category = inferCategory(article);
      const importanceScore = Math.max(55, 92 - index * 4);

      return {
        id: stableHash(`${input.digestDate}:${article.originalUrl}`),
        title: article.title,
        summaryZh: toShortChineseLikeSummary(summary),
        category,
        importanceScore,
        importanceReason: "基于来源权重、关键词和发布时间的本地规则排序。",
        sourceName: article.sourceName,
        sourceUrl: article.sourceUrl,
        publishedAt: article.publishedAt,
        imageUrl: article.imageUrl,
        originalUrl: article.originalUrl
      };
    });
  }
}

function toShortChineseLikeSummary(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "该消息缺少可用摘要，请打开原文查看详情。";
  }
  if (/[\u4e00-\u9fff]/.test(cleaned)) {
    return cleaned.length > 120 ? `${cleaned.slice(0, 118)}...` : cleaned;
  }
  return `原文摘要：${cleaned.length > 110 ? `${cleaned.slice(0, 108)}...` : cleaned}`;
}
