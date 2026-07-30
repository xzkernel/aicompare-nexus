import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/ModelPicker";
import { getModelMeta, getRoutingLabel, getProviderDisplayForSlot } from "./model-metadata";
import type { ApiKeys } from "@/lib/secure-api-keys";

type PlaygroundModelSlotProps = {
  side: "left" | "right";
  value: string;
  onChange: (value: string) => void;
  profileId: string;
  apiKeys: ApiKeys;
  onSwap?: () => void;
  showSwap?: boolean;
  disabled?: boolean;
};

export function PlaygroundModelSlot({
  side,
  value,
  onChange,
  profileId,
  apiKeys,
  onSwap,
  showSwap,
  disabled,
}: PlaygroundModelSlotProps) {
  const { providerLabel } = getProviderDisplayForSlot(value);
  const meta = getModelMeta(value);
  const routing = getRoutingLabel(value.split(":")[0], apiKeys);

  return (
    <div className="min-w-0 flex-1 border border-stroke-subtle bg-bg-paper/20">
      <div className="flex items-center justify-between border-b border-stroke-subtle px-2.5 py-1.5">
        <span className="mw-label-mono text-text-muted">{side === "left" ? "Model A" : "Model B"}</span>
        {showSwap && onSwap && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onSwap} title="Swap models" disabled={disabled}>
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
          disabled={disabled}
          ariaLabel={side === "left" ? "Model A" : "Model B"}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-stroke-subtle px-2.5 py-2 font-mono text-[9px] text-text-muted">
        <MetaItem label="Provider" value={providerLabel} />
        <MetaItem label="Context" value={meta.contextWindow} />
        <MetaItem label="Route" value={routing} />
      </div>
    </div>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="uppercase tracking-wider">{label}</span>
      <span className="text-text-secondary">{value}</span>
    </div>
  );
}

export function PlaygroundModelRow(props: {
  left: Omit<PlaygroundModelSlotProps, "side" | "showSwap">;
  right: Omit<PlaygroundModelSlotProps, "side" | "showSwap" | "onSwap">;
  onSwap: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
      <PlaygroundModelSlot side="left" {...props.left} onSwap={props.onSwap} showSwap disabled={props.disabled} />
      <PlaygroundModelSlot side="right" {...props.right} disabled={props.disabled} />
    </div>
  );
}
