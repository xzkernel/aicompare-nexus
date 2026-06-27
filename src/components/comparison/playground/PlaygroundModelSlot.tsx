import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/ModelPicker";
import { cn } from "@/lib/utils";
import { getModelMeta, getRoutingLabel, getProviderDisplayForSlot } from "./model-metadata";
import type { ApiKeys } from "@/lib/secure-api-keys";

type PlaygroundModelSlotProps = {
  side: "left" | "right";
  value: string;
  onChange: (value: string) => void;
  profileId: string;
  apiKeys: ApiKeys;
  responseTime?: number;
  onSwap?: () => void;
  showSwap?: boolean;
};

export function PlaygroundModelSlot({
  side,
  value,
  onChange,
  profileId,
  apiKeys,
  responseTime,
  onSwap,
  showSwap,
}: PlaygroundModelSlotProps) {
  const { providerLabel, modelLabel } = getProviderDisplayForSlot(value);
  const meta = getModelMeta(value);
  const routing = getRoutingLabel(value.split(":")[0], apiKeys);

  return (
    <div className="min-w-0 flex-1 border border-stroke-subtle bg-bg-paper/30">
      <div className="flex items-center justify-between border-b border-stroke-subtle px-2.5 py-1.5">
        <span className="mw-label-mono text-text-muted">{side === "left" ? "Model A" : "Model B"}</span>
        {showSwap && onSwap && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onSwap} title="Swap models">
            <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
        )}
      </div>
      <div className="p-2">
        <ModelPicker
          value={value}
          onChange={onChange}
          placeholder={`Select ${side} model…`}
          profileId={profileId}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-stroke-subtle px-2.5 py-2 font-mono text-[10px] text-text-muted">
        <MetaItem label="Provider" value={providerLabel} />
        <MetaItem label="Model" value={modelLabel} truncate />
        <MetaItem label="Context" value={meta.contextWindow} />
        <MetaItem label="Routing" value={routing} />
        <MetaItem label="Stream" value={meta.streaming ? "Yes" : "No"} />
        <MetaItem label="Multimodal" value={meta.multimodal ? "Yes" : "No"} />
        {responseTime !== undefined && responseTime > 0 && (
          <MetaItem label="Latency" value={`${Math.round(responseTime)}ms`} accent className="col-span-2" />
        )}
      </div>
    </div>
  );
}

function MetaItem({
  label,
  value,
  truncate,
  accent,
  className,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-1", className)}>
      <span className="uppercase tracking-wider">{label}</span>
      <span className={cn(truncate && "truncate max-w-[120px]", accent ? "text-accent-cyan" : "text-text-secondary")}>
        {value}
      </span>
    </div>
  );
}

export function PlaygroundModelRow(props: {
  left: Omit<PlaygroundModelSlotProps, "side" | "showSwap">;
  right: Omit<PlaygroundModelSlotProps, "side" | "showSwap" | "onSwap">;
  onSwap: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
      <PlaygroundModelSlot side="left" {...props.left} onSwap={props.onSwap} showSwap />
      <PlaygroundModelSlot side="right" {...props.right} />
    </div>
  );
}
