import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSecureApiKeys } from "../../lib/secure-api-keys";
import { useToast } from "../../hooks/use-toast";
import { getProviderDisplayName } from "../../config/providers";
import { getModelDisplayName as getRegistryModelName, resolveLiveModelValue } from "@/lib/model-registry";
import { useModelRegistry } from "@/hooks/use-model-registry";
import type { ProviderId } from "../../config/providers";
import { saveComparisonSession, type ComparisonSession } from "@/lib/session-store";
import { PlaygroundWorkbench } from "./playground/PlaygroundWorkbench";
import type { ModelResponse } from "./playground/types";
import { estimateTokens } from "./playground/types";
import { consumeCompareStream, type StreamEvent, type StreamSide } from "@/lib/compare-stream";
import {
  buildCompareHeaders,
} from "@/lib/compare-request";
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
}: {
  profileId?: string;
  restoredSession?: ComparisonSession | null;
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
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>(() => loadSearchPrefs().searchMode);

  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const pendingRef = useRef<{ left: string; right: string }>({ left: "", right: "" });
  const flushScheduledRef = useRef(false);

  useEffect(() => {
    if (!restoredSession) return;
    setPrompt(restoredSession.prompt);
    setLeftModel(restoredSession.leftModel);
    setRightModel(restoredSession.rightModel);
    const restored: ModelResponse[] = [];
    if (restoredSession.leftResponse) {
      restored.push({
        model: restoredSession.leftModel,
        status: "complete",
        response: restoredSession.leftResponse,
        responseTime: restoredSession.leftTimeMs ?? 0,
      });
    }
    if (restoredSession.rightResponse) {
      restored.push({
        model: restoredSession.rightModel,
        status: "complete",
        response: restoredSession.rightResponse,
        responseTime: restoredSession.rightTimeMs ?? 0,
      });
    }
    if (restored.length) setResponses(restored);
  }, [restoredSession?.id]);

  useEffect(() => {
    saveSearchPrefs({ searchMode });
  }, [searchMode]);

  useEffect(() => {
    if (!registry) return;
    setLeftModel((current) =>
      resolveLiveModelValue(registry, current, "openai:gpt-5.5")
    );
    setRightModel((current) =>
      resolveLiveModelValue(registry, current, "google:gemini-3.1-pro-preview")
    );
  }, [registry?.fingerprint]);

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
    setResponses((prev) => {
      if (prev.length < 2) return prev;
      const next = [...prev];
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
      return next;
    });
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    requestAnimationFrame(flushPending);
  }, [flushPending]);

  const updateSide = useCallback(
    (side: StreamSide, updater: (current: ModelResponse) => ModelResponse) => {
      const index = side === "left" ? 0 : 1;
      setResponses((prev) => {
        if (prev.length < 2) return prev;
        const next = [...prev];
        next[index] = updater(next[index]);
        return next;
      });
    },
    []
  );

  const handleCancel = useCallback(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    pendingRef.current = { left: "", right: "" };
    setIsComparing(false);
    setResponses((prev) =>
      prev.map((r) =>
        r.status === "complete"
          ? r
          : {
              ...r,
              status: "cancelled",
              error: r.response ? undefined : "Cancelled",
            }
      )
    );
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

    const leftResolved = execution.leftResolved;
    const rightResolved = execution.rightResolved;
    const [leftProviderId, leftModelId] = leftModel.split(":");
    const [rightProviderId, rightModelId] = rightModel.split(":");

    setIsComparing(true);
    pendingRef.current = { left: "", right: "" };

    const startedAt = Date.now();
    const leftCap = buildStaticSearchCapability(
      leftProviderId,
      leftResolved?.name,
      searchMode
    );
    const rightCap = buildStaticSearchCapability(
      rightProviderId,
      rightResolved?.name,
      searchMode
    );
    setResponses([
      {
        model: leftModel,
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
        model: rightModel,
        status: "loading",
        response: "",
        responseTime: 0,
        startedAt,
        searchMetadata: { ...EMPTY_SEARCH_METADATA },
        searchPhase: "idle",
        resolvedProvider: rightResolved?.name,
        searchCapability: rightCap,
      },
    ]);

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
            const meta = event.searchMetadata
              ? mergeSearchMetadata(r.searchMetadata ?? EMPTY_SEARCH_METADATA, event.searchMetadata)
              : r.searchMetadata;
            const used = isSearchActuallyUsed(meta, r.searchCapability, r.searchPhase);
            return {
              ...r,
              status: "complete",
              response:
                event.side === "left" ? pendingRef.current.left : pendingRef.current.right,
              responseTime: Math.round(event.elapsed * 1000),
              streamTokens: estimateTokens(
                event.side === "left" ? pendingRef.current.left : pendingRef.current.right
              ),
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
          prompt,
          leftModel: leftModelId,
          rightModel: rightModelId,
          leftProvider: leftResolved?.name,
          rightProvider: rightResolved?.name,
          searchMode,
        },
        headers,
        signal: controller.signal,
        onEvent: applyEvent,
      });

      if (generation !== generationRef.current) return;

      flushPending();

      setResponses((current) => {
        const left = current[0];
        const right = current[1];
        if (left?.status === "complete" || right?.status === "complete") {
          saveComparisonSession({
            prompt,
            leftModel,
            rightModel,
            leftResponse: left?.response,
            rightResponse: right?.response,
            leftTimeMs: left?.responseTime,
            rightTimeMs: right?.responseTime,
            leftTokens: estimateTokens(left?.response ?? ""),
            rightTokens: estimateTokens(right?.response ?? ""),
          }).catch(() => {
            /* local persistence failure is non-fatal */
          });
        }
        return current;
      });

      toast({
        title: "Comparison Complete",
        description: "Live evaluation finished.",
      });
    } catch (error) {
      if (generation !== generationRef.current) return;

      const isAbort = error instanceof Error && error.name === "AbortError";
      if (isAbort) return;

      const raw = error instanceof Error ? error.message : "Failed to compare models";
      const message =
        error instanceof TypeError || raw.toLowerCase().includes("failed to fetch")
          ? "Backend unreachable — start API on port 8001 (cd backend && python -m uvicorn main:app --port 8001)"
          : raw;
      toast({
        title: "Comparison Failed",
        description: message,
        variant: "destructive",
      });

      setResponses([
        {
          model: leftModel,
          status: "error",
          response: pendingRef.current.left,
          responseTime: 0,
          error: message,
        },
        {
          model: rightModel,
          status: "error",
          response: pendingRef.current.right,
          responseTime: 0,
          error: message,
        },
      ]);
    } finally {
      if (generation === generationRef.current) {
        setIsComparing(false);
        abortRef.current = null;
      }
    }
  };

  const handleSwapModels = () => {
    const temp = leftModel;
    setLeftModel(rightModel);
    setRightModel(temp);
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
      onPromptChange={setPrompt}
      onClearPrompt={() => setPrompt("")}
      leftModel={leftModel}
      rightModel={rightModel}
      onLeftModelChange={setLeftModel}
      onRightModelChange={setRightModel}
      onSwapModels={handleSwapModels}
      isComparing={isComparing}
      compareExecution={compareExecution}
      onCompare={handleCompare}
      onCancel={handleCancel}
      responses={responses}
      apiKeys={apiKeys}
      getModelDisplayName={getModelDisplayName}
      onCopyResponse={copyResponse}
      searchMode={searchMode}
      onSearchModeChange={setSearchMode}
      leftResolvedProvider={compareExecution.leftResolved?.name}
      rightResolvedProvider={compareExecution.rightResolved?.name}
    />
  );
}
