import { Activity, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import type { SourceStatus } from "../../shared/types.js";
import { formatDateTime } from "../lib/format.js";

interface SourcePanelProps {
  sources: SourceStatus[];
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const okCount = sources.filter((source) => source.status === "ok").length;
  const errorCount = sources.filter((source) => source.status === "error").length;

  return (
    <aside className="source-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Sources</span>
          <h2>数据源</h2>
        </div>
        <Activity size={20} aria-hidden />
      </div>

      <div className="source-summary">
        <span>{sources.length} 个源</span>
        <span>{okCount} 正常</span>
        <span>{errorCount} 异常</span>
      </div>

      <div className="source-list">
        {sources.map((source) => (
          <a className="source-row" href={source.url} key={source.sourceName} target="_blank" rel="noreferrer">
            {source.status === "ok" ? (
              <CheckCircle2 className="source-ok" size={16} aria-hidden />
            ) : source.status === "error" ? (
              <AlertCircle className="source-error" size={16} aria-hidden />
            ) : (
              <Circle className="source-idle" size={16} aria-hidden />
            )}
            <span className="source-name">{source.sourceName}</span>
            <span className="source-count">{source.itemCount}</span>
            <span className="source-time">{formatDateTime(source.lastFetchedAt)}</span>
          </a>
        ))}
      </div>
    </aside>
  );
}
