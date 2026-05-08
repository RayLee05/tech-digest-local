import type { Digest, JobResult, RawArticle, SourceConfig, SourceStatus } from "../../shared/types.js";
import type { AppEnv } from "../config/env.js";
import type { NotificationProvider, Ranker, SourceAdapter, StorageProvider, SummaryProvider } from "../interfaces.js";
import { HeuristicSummaryProvider } from "../providers/heuristicSummaryProvider.js";
import { formatDateInTimeZone, subtractHours } from "../utils/time.js";

interface DigestJobOptions {
  env: AppEnv;
  sources: SourceConfig[];
  sourceAdapter: SourceAdapter;
  storage: StorageProvider;
  ranker: Ranker;
  summaryProvider: SummaryProvider;
  notificationProvider: NotificationProvider;
}

export class DigestJobRunner {
  private env: AppEnv;
  private sources: SourceConfig[];
  private sourceAdapter: SourceAdapter;
  private storage: StorageProvider;
  private ranker: Ranker;
  private summaryProvider: SummaryProvider;
  private notificationProvider: NotificationProvider;
  private running = false;

  constructor(options: DigestJobOptions) {
    this.env = options.env;
    this.sources = options.sources;
    this.sourceAdapter = options.sourceAdapter;
    this.storage = options.storage;
    this.ranker = options.ranker;
    this.summaryProvider = options.summaryProvider;
    this.notificationProvider = options.notificationProvider;
  }

  async run(now = new Date()): Promise<JobResult> {
    if (this.running) {
      throw new Error("Digest job is already running");
    }

    this.running = true;
    try {
      const digestDate = formatDateInTimeZone(now, this.env.TIMEZONE);
      const fetchedArticles = await this.fetchAllSources();
      if (fetchedArticles.length > 0) {
        this.storage.upsertArticles(fetchedArticles);
      }

      const since = subtractHours(now, this.env.FETCH_LOOKBACK_HOURS).toISOString();
      const recentArticles = this.storage.getArticlesSince(since);
      const candidateLimit = Math.max(this.env.DIGEST_TOP_N * 5, this.env.DIGEST_TOP_N);
      const candidates = this.ranker.rankArticles(recentArticles, candidateLimit);
      const { items, model, notes } = await this.generateItems(candidates, digestDate);
      const rankedItems = this.ranker.rankDigestItems(items, this.env.DIGEST_TOP_N);
      const generatedAt = new Date().toISOString();

      const digest: Digest = {
        date: digestDate,
        generatedAt,
        model,
        itemCount: rankedItems.length,
        items: rankedItems,
        notes
      };

      this.storage.saveDigest(digest);
      await this.notificationProvider.notify(digest);

      return {
        digestDate,
        fetchedCount: fetchedArticles.length,
        candidateCount: candidates.length,
        itemCount: rankedItems.length,
        generatedAt,
        model,
        notes
      };
    } finally {
      this.running = false;
    }
  }

  private async fetchAllSources(): Promise<RawArticle[]> {
    const results: RawArticle[] = [];

    await Promise.all(
      this.sources.map(async (source) => {
        if (source.enabled === false) {
          this.storage.upsertSourceStatus(createStatus(source, "idle", 0));
          return;
        }

        try {
          const articles = await this.sourceAdapter.fetch(source);
          results.push(...articles);
          this.storage.upsertSourceStatus(createStatus(source, "ok", articles.length));
        } catch (error) {
          this.storage.upsertSourceStatus(createStatus(source, "error", 0, error));
        }
      })
    );

    return results;
  }

  private async generateItems(
    candidates: RawArticle[],
    digestDate: string
  ): Promise<{ items: Digest["items"]; model: string; notes?: string }> {
    if (candidates.length === 0) {
      return {
        items: [],
        model: this.summaryProvider.name,
        notes: "没有抓取到最近可用的候选新闻。"
      };
    }

    try {
      return {
        items: await this.summaryProvider.generateDigestItems({
          articles: candidates,
          digestDate,
          topN: this.env.DIGEST_TOP_N
        }),
        model: this.summaryProvider.name
      };
    } catch (error) {
      const fallback = new HeuristicSummaryProvider();
      return {
        items: await fallback.generateDigestItems({
          articles: candidates,
          digestDate,
          topN: this.env.DIGEST_TOP_N
        }),
        model: fallback.name,
        notes: `摘要提供方失败，已使用本地规则降级：${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

function createStatus(
  source: SourceConfig,
  status: SourceStatus["status"],
  itemCount: number,
  error?: unknown
): SourceStatus {
  return {
    sourceName: source.name,
    url: source.url,
    enabled: source.enabled !== false,
    status,
    lastFetchedAt: new Date().toISOString(),
    lastError: error ? (error instanceof Error ? error.message : String(error)) : undefined,
    itemCount
  };
}
