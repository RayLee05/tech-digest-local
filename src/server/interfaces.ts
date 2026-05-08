import type { Digest, DigestItem, RawArticle, SourceConfig, SourceStatus } from "../shared/types.js";

export interface SourceAdapter {
  fetch(source: SourceConfig): Promise<RawArticle[]>;
}

export interface SummaryProvider {
  readonly name: string;
  generateDigestItems(input: SummaryInput): Promise<DigestItem[]>;
}

export interface SummaryInput {
  articles: RawArticle[];
  digestDate: string;
  topN: number;
}

export interface Ranker {
  rankArticles(articles: RawArticle[], topN: number): RawArticle[];
  rankDigestItems(items: DigestItem[], topN: number): DigestItem[];
}

export interface StorageProvider {
  readonly location: string;
  init(): void;
  upsertArticles(articles: RawArticle[]): void;
  saveDigest(digest: Digest): void;
  getLatestDigest(): Digest | null;
  getDigest(date: string): Digest | null;
  getArticlesSince(isoDate: string): RawArticle[];
  upsertSourceStatus(status: SourceStatus): void;
  getSourceStatuses(): SourceStatus[];
  close(): void;
}

export interface NotificationProvider {
  notify(digest: Digest): Promise<void>;
}
