export type Category =
  | "ai"
  | "robotics"
  | "chips"
  | "internet"
  | "bigtech"
  | "research"
  | "business"
  | "policy"
  | "other";

export type SourceLanguage = "zh" | "en" | "mixed";

export interface SourceConfig {
  name: string;
  url: string;
  categoryHint?: Category;
  language?: SourceLanguage;
  weight?: number;
  enabled?: boolean;
}

export interface SourceStatus {
  sourceName: string;
  url: string;
  enabled: boolean;
  status: "idle" | "ok" | "error";
  lastFetchedAt?: string;
  lastError?: string;
  itemCount: number;
}

export interface RawArticle {
  id: string;
  title: string;
  originalUrl: string;
  sourceName: string;
  sourceUrl: string;
  sourceWeight: number;
  categoryHint?: Category;
  language?: SourceLanguage;
  publishedAt?: string;
  fetchedAt: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
}

export interface DigestItem {
  id: string;
  title: string;
  summaryZh: string;
  category: Category;
  importanceScore: number;
  importanceReason: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt?: string;
  imageUrl?: string;
  originalUrl: string;
}

export interface Digest {
  date: string;
  generatedAt: string;
  model: string;
  itemCount: number;
  items: DigestItem[];
  notes?: string;
}

export interface JobResult {
  digestDate: string;
  fetchedCount: number;
  candidateCount: number;
  itemCount: number;
  generatedAt: string;
  model: string;
  notes?: string;
}

export interface HealthResponse {
  ok: boolean;
  version: string;
  timezone: string;
  model: string;
  storage: string;
}

export interface DigestSummaryResponse {
  digest: Digest | null;
  sources: SourceStatus[];
}
