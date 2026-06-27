import type { SearchMetadata, SearchPhase } from "@/lib/search-metadata";
import type { SideSearchCapability } from "@/lib/search-capability-state";

export type PanelState = "idle" | "loading" | "streaming" | "success" | "unavailable";

export type ModelResponseStatus =
  | "loading"
  | "streaming"
  | "complete"
  | "error"
  | "cancelled";

export interface ModelResponse {
  model: string;
  status: ModelResponseStatus;
  response: string;
  responseTime: number;
  error?: string;
  /** Wall-clock start for live latency display */
  startedAt?: number;
  /** Tokens received this stream (approx chars/4) */
  streamTokens?: number;
  /** Provider-native search metadata */
  searchMetadata?: SearchMetadata;
  /** Live search phase indicator */
  searchPhase?: SearchPhase;
  /** Resolved backend provider route */
  resolvedProvider?: string;
  /** Per-side truthful search capability */
  searchCapability?: SideSearchCapability;
}

export function getPanelState(response: ModelResponse | undefined): PanelState {
  if (!response) return "idle";
  if (response.status === "loading") return "loading";
  if (response.status === "streaming") return "streaming";
  if (response.status === "complete") return "success";
  if (response.status === "error" || response.status === "cancelled") return "unavailable";
  return "idle";
}

/** i18n key under playground.status.* */
export function getStreamStatusKey(response: ModelResponse | undefined): string {
  if (!response) return "playground.status.idle";
  if (response.searchPhase === "searching") return "playground.status.searching";
  if (response.searchPhase === "grounding") return "playground.status.grounding";
  switch (response.status) {
    case "loading":
      return "playground.status.connecting";
    case "streaming":
      return "playground.status.streaming";
    case "complete":
      return "playground.status.complete";
    case "error":
      return "playground.status.failed";
    case "cancelled":
      return "playground.status.cancelled";
    default:
      return "playground.status.idle";
  }
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}
