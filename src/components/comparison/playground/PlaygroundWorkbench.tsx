import { useEffect, useState } from "react";
import { PlaygroundToolbar } from "./PlaygroundToolbar";
import { PlaygroundPromptEditor } from "./PlaygroundPromptEditor";
import { PlaygroundModelRow } from "./PlaygroundModelSlot";
import { ComparisonOutputPanel } from "./ComparisonOutputPanel";
import { LiveResponseDiff } from "./LiveResponseDiff";
import { PlaygroundWebSearchControls } from "./PlaygroundWebSearchControls";
import { useStreamDiff } from "@/hooks/use-stream-diff";
import { useGroundingSummary } from "@/hooks/use-grounding";
import { estimateTokens, getPanelState, type ModelResponse } from "./types";
import type { ApiKeys } from "@/lib/secure-api-keys";
import type { CompareExecutionState } from "@/lib/compare-execution-state";
import type { SearchMode } from "@/lib/search-metadata";
import { isSearchPolicyActive } from "@/lib/search-prefs";

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
}: PlaygroundWorkbenchProps) {
  const leftResponse = responses[0];
  const rightResponse = responses[1];
  const leftLabel = getModelDisplayName(leftModel);
  const rightLabel = getModelDisplayName(rightModel);

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
        promptTokens={estimateTokens(prompt)}
        leftResponse={leftResponse}
        rightResponse={rightResponse}
        divergenceScore={showDiff ? diff.divergenceScore : undefined}
        searchPolicyActive={isSearchPolicyActive(searchMode)}
        groundingSummary={grounding}
      />

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

      <PlaygroundModelRow
        onSwap={onSwapModels}
        left={{
          value: leftModel,
          onChange: onLeftModelChange,
          profileId,
          apiKeys,
          responseTime: leftResponse?.responseTime,
        }}
        right={{
          value: rightModel,
          onChange: onRightModelChange,
          profileId,
          apiKeys,
          responseTime: rightResponse?.responseTime,
        }}
      />

      <PlaygroundPromptEditor
        prompt={prompt}
        onChange={onPromptChange}
        onCompare={onCompare}
        onCancel={onCancel}
        onClear={onClearPrompt}
        isComparing={isComparing}
        compareExecution={compareExecution}
        leftProvider={leftModel.split(":")[0]}
        rightProvider={rightModel.split(":")[0]}
      />

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
          modelId={leftModel}
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
          modelId={rightModel}
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
    </div>
  );
}
