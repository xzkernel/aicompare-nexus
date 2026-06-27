import { Link } from "react-router-dom";
import { KeyRound, Shield, Globe, HardDrive, Activity } from "lucide-react";
import { useSecureApiKeys, hasPersistedKeys } from "@/lib/secure-api-keys";
import { cn } from "@/lib/utils";

type ByokInfrastructurePanelProps = {
  collapsed: boolean;
};

export function ByokInfrastructurePanel({ collapsed }: ByokInfrastructurePanelProps) {
  const { getApiKeyStatus } = useSecureApiKeys();
  const status = getApiKeyStatus();
  const persisted = hasPersistedKeys();

  const connectedCount = [
    status.openaiValid,
    status.googleValid,
    status.anthropicValid,
    status.metaValid,
    status.customValid,
  ].filter(Boolean).length;

  if (collapsed) {
    return (
      <p className="mx-2 mb-3 flex justify-center">
        <Link
          to="/settings"
          title="BYOK infrastructure"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md border border-stroke-subtle bg-bg-paper/60",
            status.hasValidKeys ? "text-accent-cyan" : "text-text-muted"
          )}
        >
          <KeyRound className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </p>
    );
  }

  return (
    <div className="mx-3 mb-4 space-y-2 border-t border-stroke-subtle pt-3">
      <InfraHeader ready={status.hasValidKeys} />
      <div className="space-y-2 rounded-md border border-stroke-subtle bg-bg-paper/40 p-2.5">
        <InfraRow icon={KeyRound} label="Providers" value={`${connectedCount} connected`} />
        <InfraRow icon={Activity} label="Routing" value="Direct + relay" />
        <InfraRow
          icon={HardDrive}
          label="Key storage"
          value={persisted ? "Browser local" : status.hasValidKeys ? "Session only" : "None"}
        />
        <InfraRow icon={Shield} label="Requests" value="Never stored" />
        <InfraRow icon={Globe} label="Region" value="Client-side" />
      </div>
      <Link
        to="/settings"
        className="block px-1 font-mono text-[10px] text-text-muted transition-colors hover:text-accent-cyan"
      >
        Configure keys →
      </Link>
    </div>
  );
}

function InfraHeader({ ready }: { ready: boolean }) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="mw-label-mono text-text-muted">Infrastructure</span>
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            ready ? "bg-accent-cyan animate-pulse-signal" : "bg-text-muted"
          )}
        />
        <span className="font-mono text-[10px] text-text-muted">{ready ? "Ready" : "No keys"}</span>
      </span>
    </div>
  );
}

function InfraRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof KeyRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <Icon className="h-3 w-3 shrink-0 text-text-muted" strokeWidth={1.75} />
        <span className="truncate font-mono text-[10px] uppercase tracking-wider text-text-muted">
          {label}
        </span>
      </div>
      <span className="shrink-0 font-mono text-[10px] text-text-secondary">{value}</span>
    </div>
  );
}