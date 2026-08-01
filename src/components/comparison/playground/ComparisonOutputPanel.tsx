import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LazyMarkdownRenderer } from "@/components/LazyMarkdownRenderer";
import { GroundedBadge } from "@/components/comparison/GroundedBadge";
import { CitationsPanel } from "@/components/comparison/CitationsPanel";
import { cn } from "@/lib/utils";
import type { SearchMetadata, SearchPhase } from "@/lib/search-metadata";
import type { SideSearchCapability } from "@/lib/search-capability-state";
import { isSearchActuallyUsed } from "@/lib/search-capability-state";
import type { ModelResponseStatus, PanelState } from "./types";
import { getStreamStatusKey } from "./types";
import type { DiffSegment } from "./diff-utils";



type ComparisonOutputPanelProps = {

  side: "left" | "right";

  modelLabel: string;

  modelId?: string;

  state: PanelState;

  streamStatus?: ModelResponseStatus;

  text?: string;

  error?: string;

  responseTime?: number;

  startedAt?: number;

  diffSegments?: DiffSegment[];

  onCopy?: () => void;

  searchMetadata?: SearchMetadata;

  searchPhase?: SearchPhase;

  searchCapability?: SideSearchCapability;

};



export function ComparisonOutputPanel({

  side,

  modelLabel,

  modelId,

  state,

  streamStatus,

  text = "",

  error,

  responseTime,

  startedAt,

  diffSegments,

  onCopy,

  searchMetadata,

  searchPhase = "idle",

  searchCapability,

}: ComparisonOutputPanelProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const searchUsed = isSearchActuallyUsed(searchMetadata, searchCapability, searchPhase);

  const statusLabel = t(getStreamStatusKey(

    streamStatus

      ? {
          model: "",
          status: streamStatus,
          response: text,
          responseTime: responseTime ?? 0,
          searchPhase,
        }

      : undefined

  ));



  const statusConfig = {

    idle: { label: t("playground.status.idle"), className: "text-text-muted ring-stroke-subtle" },

    loading: { label: statusLabel, className: "text-accent-yellow ring-accent-yellow/30" },

    streaming: { label: statusLabel, className: "text-accent-cyan ring-accent-cyan/30" },

    success: { label: t("playground.status.complete"), className: "text-accent-green ring-accent-green/30" },

    unavailable: { label: statusLabel, className: "text-accent-red ring-accent-red/30" },

  }[state];



  const liveMs =

    responseTime && responseTime > 0

      ? responseTime

      : startedAt

        ? Date.now() - startedAt

        : undefined;



  const exportResponse = () => {

    const blob = new Blob([text], { type: "text/plain" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = `modelwise-${side}-${Date.now()}.txt`;

    a.click();

    URL.revokeObjectURL(url);

  };



  return (

    <article

      aria-labelledby={titleId}

      aria-busy={state === "loading" || state === "streaming"}

      className={cn(

        "flex min-h-[380px] flex-col bg-bg-paper/25 lg:min-h-[520px]",

        state === "streaming" && "ring-1 ring-accent-cyan/15"

      )}

    >

      <header className="flex items-center justify-between gap-2 border-b border-stroke-subtle px-3 py-2">

        <p id={titleId} className="min-w-0 truncate text-sm font-medium text-text-primary">{modelLabel}</p>

        {modelId && import.meta.env.MODE === "development" && import.meta.env.VITE_DEBUG_UI === "1" && (

          <span className="sr-only" data-testid={`${side}-model-id`}>

            {modelId}

          </span>

        )}

        <div className="flex shrink-0 items-center gap-1.5">

          {searchCapability?.requested && (
            <GroundedBadge
              phase={searchPhase}
              searchCapability={searchCapability}
              citationCount={searchMetadata?.citations.length ?? 0}
              searchLatencyMs={searchMetadata?.searchLatencyMs}
              used={searchUsed}
              compact
            />
          )}

          <span role="status" aria-live="polite" className={cn("mw-label-mono rounded px-1.5 py-0.5 ring-1", statusConfig.className)}>

            {statusConfig.label}

          </span>

          {liveMs !== undefined && liveMs > 0 && (

            <span className="font-mono text-[10px] text-text-muted">{Math.round(liveMs)}ms</span>

          )}

          {state === "success" && onCopy && (

            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onCopy} title="Copy" aria-label="Copy response">

              <Copy className="h-3 w-3" strokeWidth={1.75} />

            </Button>

          )}

          {state === "success" && text && (

            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={exportResponse} title="Export" aria-label="Export response">

              <Download className="h-3 w-3" strokeWidth={1.75} />

            </Button>

          )}

        </div>

      </header>



      <div className="relative flex-1 overflow-hidden">

        {state === "idle" && <EmptyState message={t("playground.status.awaitingRun")} />}

        {state === "loading" && !text && <ConnectingState />}

        {state === "unavailable" && (
          <EmptyState message={error || t("playground.status.unavailable")} error />
        )}

        {state === "streaming" && (
          <div className="flex h-full flex-col overflow-hidden">
            <StreamingContent text={text} diffSegments={diffSegments} />
            {(searchPhase === "searching" || searchPhase === "grounding") &&
              ((searchMetadata?.searchQueries.length ?? 0) > 0 ||
                (searchMetadata?.citations.length ?? 0) > 0) && (
              <CitationsPanel
                citations={searchMetadata?.citations ?? []}
                queries={searchMetadata?.searchQueries}
                providerLabel={searchMetadata?.searchProvider}
                compact
              />
            )}
          </div>
        )}

        {state === "success" && (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
              <DiffHighlightedContent segments={diffSegments} fallback={text} useMarkdown />
            </div>
            {searchUsed && (
            <CitationsPanel
              citations={searchMetadata?.citations ?? []}
              queries={searchMetadata?.searchQueries}
              providerLabel={searchMetadata?.searchProvider}
              compact
            />
            )}
          </div>
        )}

        {state === "loading" && text.length > 0 && (

          <StreamingContent text={text} diffSegments={diffSegments} />

        )}

      </div>

    </article>

  );

}



function StreamingContent({

  text,

  diffSegments,

}: {

  text: string;

  diffSegments?: DiffSegment[];

}) {
  const { t } = useTranslation();

  return (

    <div className="flex h-full flex-col overflow-y-auto p-3 scrollbar-thin">

      {diffSegments?.length ? (

        <DiffHighlightedContent segments={diffSegments} fallback={text} />

      ) : (

        <div className="whitespace-pre-wrap text-[14px] leading-7 text-text-primary">

          {text}

          <StreamCursor />

        </div>

      )}

      {!text && (

        <p className="font-mono text-[10px] text-text-muted">

          {t("playground.status.awaitingToken")}

          <StreamCursor />

        </p>

      )}

    </div>

  );

}



function StreamCursor() {

  return (

    <span

      className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-accent-cyan align-middle"

      aria-hidden

    />

  );

}



function DiffHighlightedContent({

  segments,

  fallback,

  useMarkdown,

}: {

  segments?: DiffSegment[];

  fallback: string;

  useMarkdown?: boolean;

}) {

  if (useMarkdown && !segments?.length) {

    return <LazyMarkdownRenderer content={fallback} fontSize="small" />;

  }

  if (!segments?.length) {

    return (

      <div className="whitespace-pre-wrap text-[14px] leading-7 text-text-primary">

        {fallback}

        <StreamCursor />

      </div>

    );

  }



  return (

    <div className="space-y-1 text-[14px] leading-7">

      {segments.map((seg, i) => (

        <div

          key={i}

          className={cn(

            "rounded px-1 py-0.5 transition-colors duration-fast",

            seg.divergent ? "mw-diff-divergent text-text-primary" : "text-text-secondary"

          )}

        >

          {useMarkdown ? (
            <LazyMarkdownRenderer content={seg.text} fontSize="small" />
          ) : (
            seg.text
          )}

        </div>

      ))}

      {!useMarkdown && <StreamCursor />}

    </div>

  );

}



function EmptyState({ message, error }: { message: string; error?: boolean }) {

  return (

    <div className="flex h-full min-h-[200px] items-center justify-center p-6">

      <p className={cn("text-sm", error ? "text-accent-red" : "text-text-muted")}>{message}</p>

    </div>

  );

}



function ConnectingState() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-bg-soft">
        <div className="h-full w-1/4 animate-pulse rounded-full bg-accent-cyan/40" />
      </div>
      <p className="font-mono text-[10px] text-text-muted">{t("playground.status.connectingProvider")}</p>
    </div>
  );
}


