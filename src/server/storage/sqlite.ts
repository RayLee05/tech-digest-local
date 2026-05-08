import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Digest, DigestItem, RawArticle, SourceStatus } from "../../shared/types.js";
import type { StorageProvider } from "../interfaces.js";

interface DigestRow {
  date: string;
  generated_at: string;
  model: string;
  item_count: number;
  notes?: string | null;
}

interface DigestItemRow {
  id: string;
  digest_date: string;
  title: string;
  summary_zh: string;
  category: DigestItem["category"];
  importance_score: number;
  importance_reason: string;
  source_name: string;
  source_url: string;
  published_at?: string | null;
  image_url?: string | null;
  original_url: string;
}

interface ArticleRow {
  id: string;
  title: string;
  original_url: string;
  source_name: string;
  source_url: string;
  source_weight: number;
  category_hint?: RawArticle["categoryHint"] | null;
  language?: RawArticle["language"] | null;
  published_at?: string | null;
  fetched_at: string;
  summary?: string | null;
  content?: string | null;
  image_url?: string | null;
}

interface SourceStatusRow {
  source_name: string;
  url: string;
  enabled: number;
  status: SourceStatus["status"];
  last_fetched_at?: string | null;
  last_error?: string | null;
  item_count: number;
}

export class SqliteStorage implements StorageProvider {
  readonly location: string;
  private db: Database.Database;

  constructor(databasePath: string) {
    this.location = path.resolve(databasePath);
    mkdirSync(path.dirname(this.location), { recursive: true });
    this.db = new Database(this.location);
  }

  init(): void {
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        original_url TEXT NOT NULL UNIQUE,
        source_name TEXT NOT NULL,
        source_url TEXT NOT NULL,
        source_weight REAL NOT NULL,
        category_hint TEXT,
        language TEXT,
        published_at TEXT,
        fetched_at TEXT NOT NULL,
        summary TEXT,
        content TEXT,
        image_url TEXT
      );

      CREATE TABLE IF NOT EXISTS digests (
        date TEXT PRIMARY KEY,
        generated_at TEXT NOT NULL,
        model TEXT NOT NULL,
        item_count INTEGER NOT NULL,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS digest_items (
        id TEXT PRIMARY KEY,
        digest_date TEXT NOT NULL,
        title TEXT NOT NULL,
        summary_zh TEXT NOT NULL,
        category TEXT NOT NULL,
        importance_score REAL NOT NULL,
        importance_reason TEXT NOT NULL,
        source_name TEXT NOT NULL,
        source_url TEXT NOT NULL,
        published_at TEXT,
        image_url TEXT,
        original_url TEXT NOT NULL,
        FOREIGN KEY (digest_date) REFERENCES digests(date) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS source_statuses (
        source_name TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        enabled INTEGER NOT NULL,
        status TEXT NOT NULL,
        last_fetched_at TEXT,
        last_error TEXT,
        item_count INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_articles_fetched_at ON articles(fetched_at);
      CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
      CREATE INDEX IF NOT EXISTS idx_digest_items_digest_date ON digest_items(digest_date);
    `);
  }

  upsertArticles(articles: RawArticle[]): void {
    const statement = this.db.prepare(`
      INSERT INTO articles (
        id, title, original_url, source_name, source_url, source_weight, category_hint,
        language, published_at, fetched_at, summary, content, image_url
      ) VALUES (
        @id, @title, @originalUrl, @sourceName, @sourceUrl, @sourceWeight, @categoryHint,
        @language, @publishedAt, @fetchedAt, @summary, @content, @imageUrl
      )
      ON CONFLICT(original_url) DO UPDATE SET
        title = excluded.title,
        source_name = excluded.source_name,
        source_url = excluded.source_url,
        source_weight = excluded.source_weight,
        category_hint = excluded.category_hint,
        language = excluded.language,
        published_at = excluded.published_at,
        fetched_at = excluded.fetched_at,
        summary = COALESCE(excluded.summary, articles.summary),
        content = COALESCE(excluded.content, articles.content),
        image_url = COALESCE(excluded.image_url, articles.image_url)
    `);

    const transaction = this.db.transaction((items: RawArticle[]) => {
      for (const article of items) {
        statement.run({
          ...article,
          categoryHint: article.categoryHint ?? null,
          language: article.language ?? null,
          publishedAt: article.publishedAt ?? null,
          summary: article.summary ?? null,
          content: article.content ?? null,
          imageUrl: article.imageUrl ?? null
        });
      }
    });

    transaction(articles);
  }

  saveDigest(digest: Digest): void {
    const saveDigest = this.db.prepare(`
      INSERT INTO digests (date, generated_at, model, item_count, notes)
      VALUES (@date, @generatedAt, @model, @itemCount, @notes)
      ON CONFLICT(date) DO UPDATE SET
        generated_at = excluded.generated_at,
        model = excluded.model,
        item_count = excluded.item_count,
        notes = excluded.notes
    `);

    const deleteItems = this.db.prepare("DELETE FROM digest_items WHERE digest_date = ?");
    const saveItem = this.db.prepare(`
      INSERT INTO digest_items (
        id, digest_date, title, summary_zh, category, importance_score,
        importance_reason, source_name, source_url, published_at, image_url, original_url
      ) VALUES (
        @id, @digestDate, @title, @summaryZh, @category, @importanceScore,
        @importanceReason, @sourceName, @sourceUrl, @publishedAt, @imageUrl, @originalUrl
      )
    `);

    const transaction = this.db.transaction(() => {
      saveDigest.run({
        date: digest.date,
        generatedAt: digest.generatedAt,
        model: digest.model,
        itemCount: digest.itemCount,
        notes: digest.notes ?? null
      });
      deleteItems.run(digest.date);
      for (const item of digest.items) {
        saveItem.run({
          ...item,
          digestDate: digest.date,
          publishedAt: item.publishedAt ?? null,
          imageUrl: item.imageUrl ?? null
        });
      }
    });

    transaction();
  }

  getLatestDigest(): Digest | null {
    const row = this.db
      .prepare("SELECT * FROM digests ORDER BY generated_at DESC LIMIT 1")
      .get() as DigestRow | undefined;
    return row ? this.hydrateDigest(row) : null;
  }

  getDigest(date: string): Digest | null {
    const row = this.db.prepare("SELECT * FROM digests WHERE date = ?").get(date) as DigestRow | undefined;
    return row ? this.hydrateDigest(row) : null;
  }

  getArticlesSince(isoDate: string): RawArticle[] {
    const rows = this.db
      .prepare("SELECT * FROM articles WHERE fetched_at >= ? OR published_at >= ? ORDER BY COALESCE(published_at, fetched_at) DESC")
      .all(isoDate, isoDate) as ArticleRow[];
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      originalUrl: row.original_url,
      sourceName: row.source_name,
      sourceUrl: row.source_url,
      sourceWeight: row.source_weight,
      categoryHint: row.category_hint ?? undefined,
      language: row.language ?? undefined,
      publishedAt: row.published_at ?? undefined,
      fetchedAt: row.fetched_at,
      summary: row.summary ?? undefined,
      content: row.content ?? undefined,
      imageUrl: row.image_url ?? undefined
    }));
  }

  upsertSourceStatus(status: SourceStatus): void {
    this.db
      .prepare(`
        INSERT INTO source_statuses (
          source_name, url, enabled, status, last_fetched_at, last_error, item_count
        ) VALUES (
          @sourceName, @url, @enabled, @status, @lastFetchedAt, @lastError, @itemCount
        )
        ON CONFLICT(source_name) DO UPDATE SET
          url = excluded.url,
          enabled = excluded.enabled,
          status = excluded.status,
          last_fetched_at = excluded.last_fetched_at,
          last_error = excluded.last_error,
          item_count = excluded.item_count
      `)
      .run({
        ...status,
        enabled: status.enabled ? 1 : 0,
        lastFetchedAt: status.lastFetchedAt ?? null,
        lastError: status.lastError ?? null
      });
  }

  getSourceStatuses(): SourceStatus[] {
    const rows = this.db
      .prepare("SELECT * FROM source_statuses ORDER BY source_name ASC")
      .all() as SourceStatusRow[];
    return rows.map((row) => ({
      sourceName: row.source_name,
      url: row.url,
      enabled: Boolean(row.enabled),
      status: row.status,
      lastFetchedAt: row.last_fetched_at ?? undefined,
      lastError: row.last_error ?? undefined,
      itemCount: row.item_count
    }));
  }

  close(): void {
    this.db.close();
  }

  private hydrateDigest(row: DigestRow): Digest {
    const itemRows = this.db
      .prepare("SELECT * FROM digest_items WHERE digest_date = ? ORDER BY importance_score DESC")
      .all(row.date) as DigestItemRow[];

    return {
      date: row.date,
      generatedAt: row.generated_at,
      model: row.model,
      itemCount: row.item_count,
      notes: row.notes ?? undefined,
      items: itemRows.map((item) => ({
        id: item.id,
        title: item.title,
        summaryZh: item.summary_zh,
        category: item.category,
        importanceScore: item.importance_score,
        importanceReason: item.importance_reason,
        sourceName: item.source_name,
        sourceUrl: item.source_url,
        publishedAt: item.published_at ?? undefined,
        imageUrl: item.image_url ?? undefined,
        originalUrl: item.original_url
      }))
    };
  }
}
