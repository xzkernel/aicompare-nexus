import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSecureApiKeys } from "../../lib/secure-api-keys";
import { useToast } from "../../hooks/use-toast";
import { getProviderDisplayName } from "../../config/providers";
import { getModelDisplayName as getRegistryModelName, resolveLiveModelValue } from "@/lib/model-registry";
import { useModelRegistry } from "@/hooks/use-model-registry";
import type { ProviderId } from "../../config/providers";
import {
  saveComparisonSession,
  updateComparisonSessionVerdict,
  type ComparisonSession,
  type ComparisonVerdict,
} from "@/lib/session-store";
import { PlaygroundWorkbench } from "./playground/PlaygroundWorkbench";
import type { ModelResponse } from "./playground/types";
import { estimateTokens } from "./playground/types";
import { consumeCompareStream, type StreamEvent, type StreamSide } from "@/lib/compare-stream";
import { buildCompareHeaders } from "@/lib/compare-request";
import { deriveCompareExecutionState } from "@/lib/compare-execution-state";
import { loadSearchPrefs, saveSearchPrefs } from "@/lib/search-prefs";
import type { SearchMode } from "@/lib/search-metadata";
import { EMPTY_SEARCH_METADATA, mergeSearchMetadata } from "@/lib/search-metadata";
import { applySearchEventMetadata } from "@/hooks/use-grounding";
import {
  applySearchCapabilityEvent,
  buildStaticSearchCapability,
  isSearchActuallyUsed,
} from "@/lib/search-capability-state";

export function PromptPlayground({
  profileId = "default",
  restoredSession = null,
  onSessionSaved,
}: {
  profileId?: string;
  restoredSession?: ComparisonSession | null;
  onSessionSaved?: (sessionId: string) => void;
}) {
  const { t } = useTranslation();
  const { getApiKey, apiKeys } = useSecureApiKeys(profileId);
  const { registry } = useModelRegistry(profileId);
  const { toast } = useToast();
  const [leftModel, setLeftModel] = useState("openai:gpt-5.5");
  const [rightModel, setRightModel] = useState("google:gemini-3.1-pro-preview");
  const [prompt, setPrompt] = useState(
    "Answer the following in order, keeping each response short (3-6 sentences max):\n\nReasoning:\nIf you have 3 apples and take away 2, how many do you have? Explain briefly.\n\nCreativity:\nDescribe a new animal that could exist on an alien planet.\n\nClarity:\nIn simple words, explain why the sky looks blue during the day."
  );
  const [isComparing, setIsComparing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>(() => loadSearchPrefs().searchMode);
  const [verdict, setVerdict] = useState<ComparisonVerdict>();
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const pendingRef = useRef<{ left: string; right: string }>({ left: "", right: "" });
  const flushScheduledRef = useRef(false);
  const runResponsesRef = useRef<[ModelResponse, ModelResponse] | null>(null);
  const verdictSaveRef = useRef(Promise.resolve());

  const clearStaleResults = useCallback(() => {
    runResponsesRef.current = null;
    setResponses([]);
    setVerdict(undefined);
    setSavedSessionId(null);
  }, []);

  useEffect(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    pendingRef.current = { left: "", right: "" };
    runResponsesRef.current = null;
    setIsComparing(false);
    setIsFinalizing(false);
    setVerdict(restoredSession?.verdict);
    setSavedSessionId(restoredSession?.id ?? null);

    if (!restoredSession) {
      setResponses([]);
      return;
    }
    setPrompt(restoredSession.prompt);
    setLeftModel(restoredSession.leftModel);
    setRightModel(restoredSession.rightModel);
    const hasLeft = Boolean(restoredSession.leftResponse?.trim());
    const hasRight = Boolean(restoredSession.rightResponse?.trim());
    if (!hasLeft && !hasRight) {
      setResponses([]);
      return;
    }
    const restored: [ModelResponse, ModelResponse] = [
      hasLeft
        ? {
            model: restoredSession.leftModel,
            status: "complete",
            response: restoredSession.leftResponse!,
            responseTime: restoredSession.leftTimeMs ?? 0,
          }
        : {
            model: restoredSession.leftModel,
            status: "cancelled",
            response: "",
            responseTime: 0,
            error: "No saved response",
          },
      hasRight
        ? {
            model: restoredSession.rightModel,
            status: "complete",
            response: restoredSession.rightResponse!,
            responseTime: restoredSession.rightTimeMs ?? 0,
          }
        : {
            model: restoredSession.rightModel,
            status: "cancelled",
            response: "",
            responseTime: 0,
            error: "No saved response",
          },
    ];
    runResponsesRef.current = restored;
    setResponses([...restored]);
  }, [restoredSession]);

  useEffect(() => {
    saveSearchPrefs({ searchMode });
  }, [searchMode]);

  useEffect(() => {
    if (!registry || isComparing || runResponsesRef.current) return;
    setLeftModel((current) =>
      resolveLiveModelValue(registry, current, "openai:gpt-5.5")
    );
    setRightModel((current) =>
      resolveLiveModelValue(registry, current, "google:gemini-3.1-pro-preview")
    );
  }, [registry, isComparing]);

  const getModelDisplayName = (modelString: string): string => {
    const [providerId] = modelString.split(":");
    const providerName = getProviderDisplayName(providerId as ProviderId);
    const modelName = getRegistryModelName(modelString);
    return `${providerName} — ${modelName}`;
  };

  const compareExecution = useMemo(
    () =>
      deriveCompareExecutionState({
        prompt,
        leftModel,
        rightModel,
        isComparing,
        searchMode,
        apiKeys,
        getApiKey,
      }),
    [prompt, leftModel, rightModel, isComparing, searchMode, apiKeys, getApiKey]
  );

  const flushPending = useCallback(() => {
    flushScheduledRef.current = false;
    const { left, right } = pendingRef.current;
    const current = runResponsesRef.current;
    if (!current) return;
    const next: [ModelResponse, ModelResponse] = [...current];
    if (next[0].status === "streaming" || next[0].status === "loading") {
      next[0] = {
        ...next[0],
        response: left,
        status: next[0].status === "loading" && left ? "streaming" : next[0].status,
        streamTokens: estimateTokens(left),
      };
    }
    if (next[1].status === "streaming" || next[1].status === "loading") {
      next[1] = {
        ...next[1],
        response: right,
        status: next[1].status === "loading" && right ? "streaming" : next[1].status,
        streamTokens: estimateTokens(right),
      };
    }
    runResponsesRef.current = next;
    setResponses([...next]);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    requestAnimationFrame(flushPending);
  }, [flushPending]);

  const updateSide = useCallback(
    (side: StreamSide, updater: (current: ModelResponse) => ModelResponse) => {
      const index = side === "left" ? 0 : 1;
      const current = runResponsesRef.current;
      if (!current) return;
      const next: [ModelResponse, ModelResponse] = [...current];
      next[index] = updater(next[index]);
      runResponsesRef.current = next;
      setResponses([...next]);
    },
    []
  );

  const handleCancel = useCallback(() => {
    const controller = abortRef.current;
    if (!controller) return;
    generationRef.current += 1;
    controller.abort();
    abortRef.current = null;
    pendingRef.current = { left: "", right: "" };
    setIsComparing(false);
    setIsFinalizing(false);
    const current = runResponsesRef.current;
    if (current) {
      const cancelled = current.map((r) =>
        r.status === "complete"
          ? r
          : {
              ...r,
              status: "cancelled",
              error: r.response ? undefined : "Cancelled",
            }
      ) as [ModelResponse, ModelResponse];
      runResponsesRef.current = cancelled;
      setResponses([...cancelled]);
    }
  }, []);

  const handleCompare = async () => {
    const execution = deriveCompareExecutionState({
      prompt,
      leftModel,
      rightModel,
      isComparing,
      searchMode,
      apiKeys,
      getApiKey,
    });

    if (!execution.runnable) {
      if (execution.blockingReason) {
        toast({
          title: t("compare.cannotCompare"),
          description: t(execution.blockingReason),
          variant: "destructive",
        });
      }
      return;
    }

    abortRef.current?.abort();
    const generation = ++generationRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    const runPrompt = prompt;
    const runLeftModel = leftModel;
    const runRightModel = rightModel;
    const runSearchMode = searchMode;
    const leftResolved = execution.leftResolved;
    const rightResolved = execution.rightResolved;
    const [leftProviderId, leftModelId] = runLeftModel.split(":");
    const [rightProviderId, rightModelId] = runRightModel.split(":");

    setIsComparing(true);
    setIsFinalizing(false);
    setVerdict(undefined);
    setSavedSessionId(null);
    pendingRef.current = { left: "", right: "" };

    const startedAt = Date.now();
    const leftCap = buildStaticSearchCapability(
      leftProviderId,
      leftResolved?.name,
      runSearchMode
    );
    const rightCap = buildStaticSearchCapability(
      rightProviderId,
      rightResolved?.name,
      runSearchMode
    );
    const initialResponses: [ModelResponse, ModelResponse] = [
      {
        model: runLeftModel,
        status: "loading",
        response: "",
        responseTime: 0,
        startedAt,
        searchMetadata: { ...EMPTY_SEARCH_METADATA },
        searchPhase: "idle",
        resolvedProvider: leftResolved?.name,
        searchCapability: leftCap,
      },
      {
        model: runRightModel,
        status: "loading",
        response: "",
        responseTime: 0,
        startedAt,
        searchMetadata: { ...EMPTY_SEARCH_METADATA },
        searchPhase: "idle",
        resolvedProvider: rightResolved?.name,
        searchCapability: rightCap,
      },
    ];
    runResponsesRef.current = initialResponses;
    setResponses([...initialResponses]);

    const headers = buildCompareHeaders(leftResolved, rightResolved, apiKeys, getApiKey);

    const applyEvent = (event: StreamEvent) => {
      if (generation !== generationRef.current) return;
      switch (event.type) {
        case "start":
          updateSide(event.side, (r) => ({
            ...r,
            status: "streaming",
            startedAt: r.startedAt ?? Date.now(),
            resolvedProvider: event.provider ?? r.resolvedProvider,
            searchCapability: event.searchCapability
              ? applySearchCapabilityEvent(r.searchCapability!, event.searchCapability)
              : r.searchCapability,
          }));
          break;
        case "search_start":
          updateSide(event.side, (r) => ({
            ...r,
            searchPhase: "searching",
            searchCapability: r.searchCapability
              ? applySearchCapabilityEvent(r.searchCapability, { enabled: true })
              : r.searchCapability,
          }));
          break;
        case "search_sources":
          updateSide(event.side, (r) => ({
            ...r,
            searchPhase: "grounding",
            searchMetadata: mergeSearchMetadata(r.searchMetadata ?? EMPTY_SEARCH_METADATA, {
              ...EMPTY_SEARCH_METADATA,
              searchQueries: event.queries ?? [],
              searchProvider: event.provider ?? r.searchMetadata?.searchProvider,
              used: true,
            }),
            searchCapability: r.searchCapability
              ? applySearchCapabilityEvent(r.searchCapability, { used: true })
              : r.searchCapability,
          }));
          break;
        case "grounding":
          updateSide(event.side, (r) => ({
            ...r,
            searchPhase: "grounding",
          }));
          break;
        case "citations":
          updateSide(event.side, (r) => {
            const meta = event.metadata
              ? applySearchEventMetadata(r.searchMetadata ?? EMPTY_SEARCH_METADATA, event.metadata)
              : r.searchMetadata;
            const used = isSearchActuallyUsed(meta, r.searchCapability, "grounding");
            return {
              ...r,
              searchMetadata: meta,
              searchPhase: "grounding",
              searchCapability: r.searchCapability
                ? applySearchCapabilityEvent(r.searchCapability, { used })
                : r.searchCapability,
            };
          });
          break;
        case "search_complete":
          updateSide(event.side, (r) => {
            const meta = event.metadata
              ? applySearchEventMetadata(r.searchMetadata ?? EMPTY_SEARCH_METADATA, {
                  ...event.metadata,
                  skipped: event.skipped,
                  skipReason: event.reason,
                })
              : mergeSearchMetadata(r.searchMetadata ?? EMPTY_SEARCH_METADATA, {
                  ...EMPTY_SEARCH_METADATA,
                  skipped: event.skipped,
                  skipReason: event.reason,
                });
            const used = event.skipped
              ? false
              : isSearchActuallyUsed(meta, r.searchCapability, event.skipped ? "skipped" : "complete");
            return {
              ...r,
              searchPhase: event.skipped ? "skipped" : used ? "complete" : "idle",
              searchMetadata: meta,
              searchCapability: r.searchCapability
                ? applySearchCapabilityEvent(r.searchCapability, {
                    used,
                    skipReason: event.reason ?? r.searchCapability.skipReason,
                  })
                : r.searchCapability,
            };
          });
          break;
        case "token": {
          if (event.side === "left") {
            pendingRef.current.left += event.delta;
          } else {
            pendingRef.current.right += event.delta;
          }
          scheduleFlush();
          break;
        }
        case "done":
          if (event.side === "left") {
            pendingRef.current.left = event.text ?? pendingRef.current.left;
          } else {
            pendingRef.current.right = event.text ?? pendingRef.current.right;
          }
          flushPending();
          updateSide(event.side, (r) => {
            const response =
              event.side === "left" ? pendingRef.current.left : pendingRef.current.right;
            const meta = event.searchMetadata
              ? mergeSearchMetadata(r.searchMetadata ?? EMPTY_SEARCH_METADATA, event.searchMetadata)
              : r.searchMetadata;
            const used = isSearchActuallyUsed(meta, r.searchCapability, r.searchPhase);
            return {
              ...r,
              status: response.trim() ? "complete" : "error",
              response,
              error: response.trim() ? undefined : "Model returned an empty response",
              responseTime: Math.round(event.elapsed * 1000),
              streamTokens: response.trim() ? estimateTokens(response) : 0,
              searchMetadata: meta,
              searchPhase: used ? "complete" : r.searchPhase === "skipped" ? "skipped" : "idle",
              searchCapability: r.searchCapability
                ? applySearchCapabilityEvent(r.searchCapability, { used })
                : r.searchCapability,
            };
          });
          break;
        case "error":
          updateSide(event.side, (r) => ({
            ...r,
            status: "error",
            response:
              event.side === "left" ? pendingRef.current.left : pendingRef.current.right,
            error: event.message,
            responseTime: event.elapsed ? Math.round(event.elapsed * 1000) : r.responseTime,
          }));
          break;
        case "complete":
          break;
      }
    };

    try {
      await consumeCompareStream({
        body: {
          prompt: runPrompt,
          leftModel: leftModelId,
          rightModel: rightModelId,
          leftProvider: leftResolved?.name,
          rightProvider: rightResolved?.name,
          searchMode: runSearchMode,
        },
        headers,
        signal: controller.signal,
        onEvent: applyEvent,
      });

      if (generation !== generationRef.current) return;

    } catch (error) {
      if (generation !== generationRef.current) return;

      const isAbort = error instanceof Error && error.name === "AbortError";
      if (isAbort) return;

      const raw = error instanceof Error ? error.message : "Failed to compare models";
      const message =
        error instanceof TypeError || raw.toLowerCase().includes("failed to fetch")
          ? "Backend unreachable — start API on port 8001 (cd backend && python -m uvicorn main:app --port 8001)"
          : raw;
      flushPending();
      updateSide("left", (response) =>
        response.status === "complete" || response.status === "error"
          ? response
          : { ...response, status: "error", response: pendingRef.current.left, error: message }
      );
      updateSide("right", (response) =>
        response.status === "complete" || response.status === "error"
          ? response
          : { ...response, status: "error", response: pendingRef.current.right, error: message }
      );
    }

    if (generation !== generationRef.current) return;
    abortRef.current = null;
    setIsFinalizing(true);
    flushPending();
    updateSide("left", (response) =>
      response.status === "loading" || response.status === "streaming"
        ? { ...response, status: "error", error: "Stream ended before the model completed" }
        : response
    );
    updateSide("right", (response) =>
      response.status === "loading" || response.status === "streaming"
        ? { ...response, status: "error", error: "Stream ended before the model completed" }
        : response
    );

    const finalResponses = runResponsesRef.current;
    if (!finalResponses) {
      setIsFinalizing(false);
      setIsComparing(false);
      return;
    }
    const [left, right] = finalResponses;
    const leftValid = left.status === "complete" && Boolean(left.response.trim());
    const rightValid = right.status === "complete" && Boolean(right.response.trim());

    if (leftValid || rightValid) {
      try {
        const saved = await saveComparisonSession({
          prompt: runPrompt,
          leftModel: runLeftModel,
          rightModel: runRightModel,
          leftResponse: leftValid ? left.response : undefined,
          rightResponse: rightValid ? right.response : undefined,
          leftTimeMs: leftValid ? left.responseTime : undefined,
          rightTimeMs: rightValid ? right.responseTime : undefined,
          leftTokens: leftValid ? estimateTokens(left.response) : undefined,
          rightTokens: rightValid ? estimateTokens(right.response) : undefined,
        });
        if (generation === generationRef.current) {
          setSavedSessionId(saved.id);
          onSessionSaved?.(saved.id);
        }
      } catch {
        /* local persistence failure is non-fatal */
      }
    }

    if (generation !== generationRef.current) return;
    setIsFinalizing(false);
    setIsComparing(false);
    abortRef.current = null;
    if (leftValid && rightValid) {
      toast({ title: "Comparison Complete", description: "Both model responses completed." });
    } else if (leftValid || rightValid) {
      toast({
        title: "Comparison Partially Complete",
        description: `${leftValid ? "Model A" : "Model B"} completed; ${leftValid ? "Model B" : "Model A"} failed.`,
      });
    } else {
      toast({
        title: "Comparison Failed",
        description: "Neither model produced a valid completed response.",
        variant: "destructive",
      });
    }
  };

  const handleSwapModels = () => {
    if (isComparing) return;
    clearStaleResults();
    setLeftModel(rightModel);
    setRightModel(leftModel);
  };

  const handlePromptChange = (value: string) => {
    if (isComparing || value === prompt) return;
    clearStaleResults();
    setPrompt(value);
  };

  const handleLeftModelChange = (value: string) => {
    if (isComparing || value === leftModel) return;
    clearStaleResults();
    setLeftModel(value);
  };

  const handleRightModelChange = (value: string) => {
    if (isComparing || value === rightModel) return;
    clearStaleResults();
    setRightModel(value);
  };

  const handleSearchModeChange = (value: SearchMode) => {
    if (isComparing || value === searchMode) return;
    clearStaleResults();
    setSearchMode(value);
  };

  const handleVerdictChange = (value: ComparisonVerdict) => {
    const current = runResponsesRef.current;
    const bothValid = current?.every(
      (response) => response.status === "complete" && Boolean(response.response.trim())
    );
    if (isComparing || !bothValid) return;
    setVerdict(value);
    if (savedSessionId) {
      const sessionId = savedSessionId;
      verdictSaveRef.current = verdictSaveRef.current
        .then(() => updateComparisonSessionVerdict(sessionId, value))
        .then(() => undefined)
        .catch(() => undefined);
    }
  };

  const copyResponse = (response: string) => {
    navigator.clipboard.writeText(response);
    toast({ title: "Copied", description: "Response copied to clipboard." });
  };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return (
    <PlaygroundWorkbench
      profileId={profileId}
      prompt={prompt}
      onPromptChange={handlePromptChange}
      onClearPrompt={() => handlePromptChange("")}
      leftModel={leftModel}
      rightModel={rightModel}
      onLeftModelChange={handleLeftModelChange}
      onRightModelChange={handleRightModelChange}
      onSwapModels={handleSwapModels}
      isComparing={isComparing}
      isFinalizing={isFinalizing}
      compareExecution={compareExecution}
      onCompare={handleCompare}
      onCancel={handleCancel}
      responses={responses}
      apiKeys={apiKeys}
      getModelDisplayName={getModelDisplayName}
      onCopyResponse={copyResponse}
      searchMode={searchMode}
      onSearchModeChange={handleSearchModeChange}
      leftResolvedProvider={compareExecution.leftResolved?.name}
      rightResolvedProvider={compareExecution.rightResolved?.name}
      verdict={verdict}
      onVerdictChange={handleVerdictChange}
    />
  );
}
