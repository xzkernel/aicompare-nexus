import { ExternalLink } from "lucide-react";
import type { NormalizedCitation } from "@/lib/search-metadata";
import { sanitizeCitationUrl } from "@/lib/safe-url";

type CitationsPanelProps = {
  citations: NormalizedCitation[];
  queries?: string[];
  providerLabel?: string;
  compact?: boolean;
};

export function CitationsPanel({ citations, queries = [], providerLabel, compact }: CitationsPanelProps) {
  if (!citations.length && !queries.length) return null;

  return (
    <div
      className={
        compact
          ? "mt-2 border-t border-stroke-subtle pt-2"
          : "border-t border-stroke-subtle bg-bg-soft/20 px-3 py-2"
      }
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="mw-label-mono text-[9px] text-text-muted">Sources</span>
        {providerLabel && (
          <span className="font-mono text-[9px] text-accent-cyan/80">{providerLabel}</span>
        )}
      </div>

      {queries.length > 0 && (
        <p className="mb-2 font-mono text-[10px] text-text-muted">
          Queries: {queries.join(" · ")}
        </p>
      )}

      <ul className="space-y-1">
        {citations.map((c, i) => {
          const safeUrl = sanitizeCitationUrl(c.url);
          return (
            <li key={`${c.url}-${i}`} className="flex items-start gap-2">
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-text-muted" strokeWidth={1.5} />
              <div className="min-w-0">
                {safeUrl ? (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-[10px] text-accent-cyan hover:underline"
                  >
                    {c.title || c.hostname}
                  </a>
                ) : (
                  <span className="block truncate font-mono text-[10px] text-text-muted">
                    {c.title || c.hostname}
                  </span>
                )}
                <span className="font-mono text-[9px] text-text-muted">{c.hostname}</span>
                {c.snippet && (
                  <p className="mt-0.5 line-clamp-2 font-mono text-[9px] text-text-secondary">
                    {c.snippet}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
