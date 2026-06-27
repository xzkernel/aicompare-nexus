import { getCachedRegistry } from "@/lib/model-registry/client";
import { getModelMeta, getRoutingLabel } from "@/components/comparison/playground/model-metadata";
import type { ApiKeyStatus } from "@/lib/secure-api-keys";
import type { ProviderId } from "@/config/providers";

export const EVALUATION_LANES: {
  id: string;
  left: string;
  right: string;
  label: string;
}[] = [
  {
    id: "gpt-claude",
    left: "openai:gpt-5.5",
    right: "anthropic:claude-sonnet-4-6",
    label: "GPT-5.5 vs Claude Sonnet 4.6",
  },
  {
    id: "gpt-gemini",
    left: "openai:gpt-5-mini",
    right: "google:gemini-3.5-flash",
    label: "GPT-5 Mini vs Gemini 3.5 Flash",
  },
  {
    id: "claude-llama",
    left: "anthropic:claude-opus-4-8",
    right: "meta:deepseek/deepseek-v4-flash",
    label: "Claude Opus 4.8 vs DeepSeek V4 Flash",
  },
];

export function countRegistryModels(): number {
  const reg = getCachedRegistry();
  if (reg) return reg.options.length;
  return 13;
}

export function countActiveProviders(
  status: Pick<
    ApiKeyStatus,
    "openaiValid" | "googleValid" | "anthropicValid" | "metaValid" | "customValid"
  >
): number {
  return [
    status.openaiValid,
    status.googleValid,
    status.anthropicValid,
    status.metaValid,
    status.customValid,
  ].filter(Boolean).length;
}

export function routingHealthLabel(status: ApiKeyStatus): { label: string; ok: boolean } {
  const active = countActiveProviders(status);
  if (active === 0) return { label: "no routes", ok: false };
  if (!status.hasValidKeys) return { label: "degraded", ok: false };
  if (active >= 2) return { label: "multi-path", ok: true };
  return { label: "single-path", ok: true };
}

export function averageTypicalLatencyMs(): string {
  const reg = getCachedRegistry();
  const ids = reg?.options.map((o) => o.value) ?? [];
  const values = ids
    .map((id) => getModelMeta(id).typicalLatency)
    .map((s) => parseFloat(s.replace(/[^\d.]/g, "")))
    .filter((n) => !Number.isNaN(n));
  if (!values.length) return "—";
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return `~${avg.toFixed(1)}s`;
}

export function laneReadiness(
  lane: (typeof EVALUATION_LANES)[number],
  status: ApiKeyStatus
): { ready: boolean; reason: string } {
  const need = [lane.left.split(":")[0], lane.right.split(":")[0]] as ProviderId[];
  const map: Record<ProviderId, boolean> = {
    openai: status.openaiValid,
    google: status.googleValid,
    anthropic: status.anthropicValid,
    meta: status.metaValid,
    custom: status.customValid,
  };
  const missing = need.filter((p) => !map[p]);
  if (missing.length === 0) return { ready: true, reason: "keys present" };
  return { ready: false, reason: `needs ${missing.join(", ")}` };
}

export function getLaneMeta(lane: (typeof EVALUATION_LANES)[number]) {
  const left = getModelMeta(lane.left);
  const right = getModelMeta(lane.right);
  return { left, right };
}

export function latencyRaceLabel(leftTypical: string, rightTypical: string): string {
  const l = parseFloat(leftTypical.replace(/[^\d.]/g, ""));
  const r = parseFloat(rightTypical.replace(/[^\d.]/g, ""));
  if (Number.isNaN(l) || Number.isNaN(r)) return "—";
  if (l < r) return "left typically faster";
  if (r < l) return "right typically faster";
  return "parity";
}
