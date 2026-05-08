import { ExternalLink } from "lucide-react";
import type { DigestItem } from "../../shared/types.js";
import { categoryLabels, formatDate } from "../lib/format.js";

interface DigestCardProps {
  item: DigestItem;
  rank: number;
}

export function DigestCard({ item, rank }: DigestCardProps) {
  return (
    <article className="digest-card">
      <a className="digest-media" href={item.originalUrl} target="_blank" rel="noreferrer" aria-label={item.title}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className={`media-placeholder media-${item.category}`}>
            <span>{categoryLabels[item.category]}</span>
          </div>
        )}
      </a>

      <div className="digest-content">
        <div className="digest-meta">
          <span className="rank">#{rank}</span>
          <span className={`category category-${item.category}`}>{categoryLabels[item.category]}</span>
          <span>{formatDate(item.publishedAt)}</span>
        </div>

        <h2>
          <a href={item.originalUrl} target="_blank" rel="noreferrer">
            {item.title}
          </a>
        </h2>

        <p className="summary">{item.summaryZh}</p>

        <div className="digest-footer">
          <div>
            <strong>{Math.round(item.importanceScore)}</strong>
            <span>{item.importanceReason}</span>
          </div>
          <a className="source-link" href={item.originalUrl} target="_blank" rel="noreferrer" title="打开原文">
            {item.sourceName}
            <ExternalLink size={14} aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}
