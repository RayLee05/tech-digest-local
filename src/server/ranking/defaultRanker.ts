import type { Category, DigestItem, RawArticle } from "../../shared/types.js";
import type { Ranker } from "../interfaces.js";

const categoryWeights: Record<Category, number> = {
  ai: 1.18,
  chips: 1.16,
  robotics: 1.1,
  bigtech: 1.08,
  internet: 1.0,
  research: 1.04,
  business: 0.98,
  policy: 0.96,
  other: 0.86
};

const keywordWeights = [
  { pattern: /openai|gpt|agent|claude|gemini|llm|大模型|智能体|推理模型/i, score: 11 },
  { pattern: /nvidia|gpu|cuda|blackwell|芯片|半导体|台积电|tsmc|eda/i, score: 10 },
  { pattern: /robot|机器人|具身智能|humanoid|自动驾驶/i, score: 8 },
  { pattern: /launch|release|发布|融资|acquisition|收购|ipo|earnings|财报/i, score: 6 },
  { pattern: /regulation|policy|ban|lawsuit|监管|政策|诉讼/i, score: 5 }
];

export class DefaultRanker implements Ranker {
  rankArticles(articles: RawArticle[], topN: number): RawArticle[] {
    const unique = dedupeArticles(articles);
    return unique
      .map((article) => ({ article, score: scoreArticle(article) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(({ article }) => article);
  }

  rankDigestItems(items: DigestItem[], topN: number): DigestItem[] {
    return items
      .map((item) => ({
        ...item,
        importanceScore: clampScore(item.importanceScore)
      }))
      .sort((a, b) => {
        const scoreDelta = b.importanceScore - a.importanceScore;
        if (scoreDelta !== 0) {
          return scoreDelta;
        }
        return dateValue(b.publishedAt) - dateValue(a.publishedAt);
      })
      .slice(0, topN);
  }
}

export function scoreArticle(article: RawArticle): number {
  const text = `${article.title} ${article.summary ?? ""} ${article.content ?? ""}`;
  const categoryMultiplier = categoryWeights[article.categoryHint ?? "other"];
  const keywordScore = keywordWeights.reduce((score, rule) => score + (rule.pattern.test(text) ? rule.score : 0), 0);
  const recencyScore = calculateRecencyScore(article.publishedAt ?? article.fetchedAt);
  const sourceScore = Math.min(18, 12 * article.sourceWeight);

  return (sourceScore + keywordScore + recencyScore) * categoryMultiplier;
}

export function inferCategory(article: Pick<RawArticle, "title" | "summary" | "content" | "categoryHint">): Category {
  if (article.categoryHint) {
    return article.categoryHint;
  }

  const text = `${article.title} ${article.summary ?? ""} ${article.content ?? ""}`.toLowerCase();
  if (/gpu|chip|semiconductor|nvidia|tsmc|芯片|半导体|光刻|晶圆/.test(text)) {
    return "chips";
  }
  if (/robot|humanoid|机器人|具身智能|自动驾驶/.test(text)) {
    return "robotics";
  }
  if (/openai|gpt|llm|model|agent|ai|大模型|智能体|人工智能/.test(text)) {
    return "ai";
  }
  if (/apple|google|meta|microsoft|amazon|字节|阿里|腾讯|百度|华为/.test(text)) {
    return "bigtech";
  }
  if (/policy|regulation|监管|政策|法案/.test(text)) {
    return "policy";
  }
  return "internet";
}

function dedupeArticles(articles: RawArticle[]): RawArticle[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const result: RawArticle[] = [];

  for (const article of articles) {
    const titleKey = article.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (seenUrls.has(article.originalUrl) || seenTitles.has(titleKey)) {
      continue;
    }
    seenUrls.add(article.originalUrl);
    seenTitles.add(titleKey);
    result.push(article);
  }

  return result;
}

function calculateRecencyScore(isoDate: string): number {
  const ageHours = Math.max(0, (Date.now() - new Date(isoDate).getTime()) / 3_600_000);
  if (ageHours <= 12) {
    return 20;
  }
  if (ageHours <= 24) {
    return 15;
  }
  if (ageHours <= 48) {
    return 9;
  }
  return 3;
}

function clampScore(score: number): number {
  return Math.max(1, Math.min(100, Math.round(score)));
}

function dateValue(value?: string): number {
  return value ? new Date(value).getTime() : 0;
}
