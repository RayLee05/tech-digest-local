import { CalendarDays, RefreshCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Category, Digest, SourceStatus } from "../shared/types.js";
import { DigestCard } from "./components/DigestCard.js";
import { SourcePanel } from "./components/SourcePanel.js";
import { api } from "./lib/api.js";
import { categoryLabels, formatDateTime } from "./lib/format.js";

type CategoryFilter = Category | "all";

const categoryOrder: CategoryFilter[] = ["all", "ai", "chips", "robotics", "bigtech", "internet", "research", "business", "policy", "other"];

export function App() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadLatest();
  }, []);

  const filteredItems = useMemo(() => {
    if (!digest) {
      return [];
    }
    if (category === "all") {
      return digest.items;
    }
    return digest.items.filter((item) => item.category === category);
  }, [category, digest]);

  async function loadLatest() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.latest();
      setDigest(response.digest);
      setSources(response.sources);
      setSelectedDate(response.digest?.date ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  async function loadByDate(date: string) {
    if (!date) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.digest(date);
      setDigest(response.digest);
      setSources(response.sources);
      setSelectedDate(date);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  async function runJob() {
    setRunning(true);
    setError(null);
    try {
      const result = await api.runJob();
      const response = await api.digest(result.digestDate);
      setDigest(response.digest);
      setSources(response.sources);
      setSelectedDate(result.digestDate);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <span className="eyebrow">Tech Digest</span>
          <h1>科技日报</h1>
        </div>

        <div className="actions">
          <label className="date-picker">
            <CalendarDays size={18} aria-hidden />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                void loadByDate(event.target.value);
              }}
            />
          </label>
          <button className="icon-button" type="button" onClick={() => void loadLatest()} title="最新日报" disabled={loading}>
            <Search size={18} aria-hidden />
          </button>
          <button className="primary-button" type="button" onClick={() => void runJob()} disabled={running}>
            <RefreshCcw size={18} aria-hidden className={running ? "spin" : undefined} />
            {running ? "生成中" : "手动刷新"}
          </button>
        </div>
      </section>

      <section className="digest-strip">
        <div>
          <span className="stat-label">日报日期</span>
          <strong>{digest?.date ?? "暂无"}</strong>
        </div>
        <div>
          <span className="stat-label">更新时间</span>
          <strong>{formatDateTime(digest?.generatedAt)}</strong>
        </div>
        <div>
          <span className="stat-label">条目</span>
          <strong>{digest?.itemCount ?? 0}</strong>
        </div>
        <div>
          <span className="stat-label">模型</span>
          <strong>{digest?.model ?? "待生成"}</strong>
        </div>
      </section>

      {error ? <div className="alert">{error}</div> : null}
      {digest?.notes ? <div className="notice">{digest.notes}</div> : null}

      <div className="layout">
        <section className="feed-area">
          <div className="filters" role="tablist" aria-label="新闻分类">
            {categoryOrder.map((item) => (
              <button
                className={item === category ? "filter active" : "filter"}
                key={item}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item === "all" ? "全部" : categoryLabels[item]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state">加载中...</div>
          ) : filteredItems.length > 0 ? (
            <div className="digest-list">
              {filteredItems.map((item, index) => (
                <DigestCard item={item} key={item.id} rank={index + 1} />
              ))}
            </div>
          ) : (
            <div className="empty-state">暂无日报内容</div>
          )}
        </section>

        <SourcePanel sources={sources} />
      </div>
    </main>
  );
}
