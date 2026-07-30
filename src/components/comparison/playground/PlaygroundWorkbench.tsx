import { useEffect, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { PlaygroundToolbar } from "./PlaygroundToolbar";
import { PlaygroundPromptEditor } from "./PlaygroundPromptEditor";
import { PlaygroundModelRow } from "./PlaygroundModelSlot";
import { ComparisonOutputPanel } from "./ComparisonOutputPanel";
import { LiveResponseDiff } from "./LiveResponseDiff";
import { PlaygroundWebSearchControls } from "./PlaygroundWebSearchControls";
import { EvaluationSummary } from "./EvaluationSummary";
import { useStreamDiff } from "@/hooks/use-stream-diff";
import { useGroundingSummary } from "@/hooks/use-grounding";
import { getPanelState, type ModelResponse } from "./types";
import type { ApiKeys } from "@/lib/secure-api-keys";
import type { CompareExecutionState } from "@/lib/compare-execution-state";
import type { SearchMode } from "@/lib/search-metadata";
import type { ComparisonVerdict } from "@/lib/session-store";

export type PlaygroundWorkbenchProps = {
  profileId: string;
  prompt: string;
  onPromptChange: (value: string) => void;
  onClearPrompt: () => void;
  leftModel: string;
  rightModel: string;
  onLeftModelChange: (value: string) => void;
  onRightModelChange: (value: string) => void;
  onSwapModels: () => void;
  isComparing: boolean;
  isFinalizing: boolean;
  compareExecution: CompareExecutionState;
  onCompare: () => void;
  onCancel?: () => void;
  responses: ModelResponse[];
  apiKeys: ApiKeys;
  getModelDisplayName: (model: string) => string;
  onCopyResponse: (text: string) => void;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  leftResolvedProvider?: string;
  rightResolvedProvider?: string;
  verdict?: ComparisonVerdict;
  onVerdictChange: (verdict: ComparisonVerdict) => void;
};

export function PlaygroundWorkbench({
  profileId,
  prompt,
  onPromptChange,
  onClearPrompt,
  leftModel,
  rightModel,
  onLeftModelChange,
  onRightModelChange,
  onSwapModels,
  isComparing,
  isFinalizing,
  compareExecution,
  onCompare,
  onCancel,
  responses,
  apiKeys,
  getModelDisplayName,
  onCopyResponse,
  searchMode,
  onSearchModeChange,
  leftResolvedProvider,
  rightResolvedProvider,
  verdict,
  onVerdictChange,
}: PlaygroundWorkbenchProps) {
  const leftResponse = responses[0];
  const rightResponse = responses[1];
  const leftOutputModel = leftResponse?.model ?? leftModel;
  const rightOutputModel = rightResponse?.model ?? rightModel;
  const leftLabel = getModelDisplayName(leftOutputModel);
  const rightLabel = getModelDisplayName(rightOutputModel);

  const [, setLiveTick] = useState(0);
  useEffect(() => {
    if (!isComparing) return;
    const id = window.setInterval(() => setLiveTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [isComparing]);

  const leftText = leftResponse?.response ?? "";
  const rightText = rightResponse?.response ?? "";
  const diffEnabled = leftText.length > 0 && rightText.length > 0;
  const diff = useStreamDiff(leftText, rightText, diffEnabled || isComparing, 200);
  const showDiff = diffEnabled;
  const grounding = useGroundingSummary(
    leftResponse?.searchMetadata,
    rightResponse?.searchMetadata,
    leftResponse?.searchCapability,
    rightResponse?.searchCapability,
    leftResponse?.searchPhase,
    rightResponse?.searchPhase
  );

  const liveLeftMs =
    leftResponse?.responseTime ||
    (leftResponse?.startedAt ? Date.now() - leftResponse.startedAt : undefined);
  const liveRightMs =
    rightResponse?.responseTime ||
    (rightResponse?.startedAt ? Date.now() - rightResponse.startedAt : undefined);

  return (
    <div className="space-y-4">
      <PlaygroundToolbar
        leftModelLabel={leftLabel}
        rightModelLabel={rightLabel}
        isComparing={isComparing}
        leftResponse={leftResponse}
        rightResponse={rightResponse}
      />

      <PlaygroundModelRow
        onSwap={onSwapModels}
        disabled={isComparing}
        left={{
          value: leftModel,
          onChange: onLeftModelChange,
          profileId,
          apiKeys,
        }}
        right={{
          value: rightModel,
          onChange: onRightModelChange,
          profileId,
          apiKeys,
        }}
      />

      <PlaygroundPromptEditor
        prompt={prompt}
        onChange={onPromptChange}
        onCompare={onCompare}
        onCancel={isFinalizing ? undefined : onCancel}
        onClear={onClearPrompt}
        isComparing={isComparing}
        isFinalizing={isFinalizing}
        compareExecution={compareExecution}
        leftProvider={leftModel.split(":")[0]}
        rightProvider={rightModel.split(":")[0]}
      />

      <details className="group border border-stroke-subtle bg-bg-soft/15">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.75} />
            <span className="text-sm font-medium text-text-primary">Run controls</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
              Search {searchMode}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-stroke-subtle">
          <PlaygroundWebSearchControls
            searchMode={searchMode}
            onSearchModeChange={onSearchModeChange}
            leftProviderId={leftModel.split(":")[0]}
            rightProviderId={rightModel.split(":")[0]}
            leftRoute={leftResolvedProvider}
            rightRoute={rightResolvedProvider}
            leftResponse={leftResponse}
            rightResponse={rightResponse}
            isComparing={isComparing}
          />
        </div>
      </details>

      {(showDiff || isComparing) && (
        <LiveResponseDiff
          divergenceScore={diff.divergenceScore}
          sharedLines={diff.sharedLines}
          totalLines={diff.totalLines}
          leftLatency={liveLeftMs}
          rightLatency={liveRightMs}
          isComparing={isComparing}
          groundedMismatch={grounding.groundedMismatch}
          searchParityBreak={grounding.searchParityBreak}
          citationOverlapPct={grounding.citationOverlapPct}
          leftGrounded={grounding.leftGrounded}
          rightGrounded={grounding.rightGrounded}
        />
      )}

      <section className="grid grid-cols-1 divide-y border border-stroke-subtle lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <ComparisonOutputPanel
          side="left"
          modelLabel={leftLabel}
          modelId={leftOutputModel}
          state={getPanelState(leftResponse)}
          streamStatus={leftResponse?.status}
          text={leftResponse?.response}
          error={leftResponse?.error}
          responseTime={leftResponse?.responseTime}
          startedAt={leftResponse?.startedAt}
          diffSegments={showDiff ? diff.leftSegments : undefined}
          onCopy={() => leftResponse?.response && onCopyResponse(leftResponse.response)}
          searchMetadata={leftResponse?.searchMetadata}
          searchPhase={leftResponse?.searchPhase}
          searchCapability={leftResponse?.searchCapability}
        />
        <ComparisonOutputPanel
          side="right"
          modelLabel={rightLabel}
          modelId={rightOutputModel}
          state={getPanelState(rightResponse)}
          streamStatus={rightResponse?.status}
          text={rightResponse?.response}
          error={rightResponse?.error}
          responseTime={rightResponse?.responseTime}
          startedAt={rightResponse?.startedAt}
          diffSegments={showDiff ? diff.rightSegments : undefined}
          onCopy={() => rightResponse?.response && onCopyResponse(rightResponse.response)}
          searchMetadata={rightResponse?.searchMetadata}
          searchPhase={rightResponse?.searchPhase}
          searchCapability={rightResponse?.searchCapability}
        />
      </section>

      <EvaluationSummary
        leftLabel={leftLabel}
        rightLabel={rightLabel}
        leftResponse={leftResponse}
        rightResponse={rightResponse}
        divergenceScore={diff.divergenceScore}
        sharedLines={diff.sharedLines}
        totalLines={diff.totalLines}
        isComparing={isComparing}
        verdict={verdict}
        onVerdictChange={onVerdictChange}
        grounding={grounding}
      />
    </div>
  );
}
