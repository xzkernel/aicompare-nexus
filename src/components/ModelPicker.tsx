import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModelRegistry } from "@/hooks/use-model-registry";
import {
  filterOptionsBySearch,
  getModelCapabilities,
  groupOptionsByProvider,
} from "@/lib/model-registry";
import { ModelCapabilityBadges } from "@/components/ModelCapabilityBadges";
import { useSecureApiKeys } from "@/lib/secure-api-keys";
import type { RegistryFilters } from "@/types/registry";
import { cn } from "@/lib/utils";

interface ModelPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  profileId?: string;
  filters?: RegistryFilters;
  showFilterToggles?: boolean;
}

export function ModelPicker({
  value,
  onChange,
  placeholder = "Select a model…",
  className = "",
  profileId = "default",
  filters: externalFilters,
  showFilterToggles = true,
}: ModelPickerProps) {
  const { getApiKey } = useSecureApiKeys(profileId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [localFilters, setLocalFilters] = useState<RegistryFilters>({});

  const filters = useMemo(
    () => ({ ...localFilters, ...externalFilters }),
    [localFilters, externalFilters]
  );

  const { options, loading, registry, error, reload } = useModelRegistry(profileId, filters);

  const searchedOptions = useMemo(
    () => filterOptionsBySearch(options, search),
    [options, search]
  );

  const groupedOptions = useMemo(
    () => groupOptionsByProvider(searchedOptions),
    [searchedOptions]
  );

  const hasValidKey = (providerId: string): boolean => !!getApiKey(providerId);

  const staleValue = value && registry && !registry.byFullId.has(value);
  const syncSource = registry?.syncSource;
  const modelCount = registry?.options.length ?? 0;
  const liveSync = syncSource === "live" && registry?.openRouterHydrated;

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const syncMessage =
    syncSource === "legacy-backend"
      ? "Backend on :8001 is running an old build (catalog v1 with GPT-4o). Stop that Python/uvicorn window and restart: cd backend && python -m uvicorn main:app --reload --port 8001"
      : syncSource === "offline"
        ? "Cannot reach backend on :8001 — start it with backend\\start.bat, then click Retry."
        : null;

  const toggleFilter = (key: keyof RegistryFilters) => {
    setLocalFilters((f) => ({ ...f, [key]: !f[key] }));
  };

  return (
    <div className={cn("relative space-y-2 overflow-visible", className)}>
      {showFilterToggles && (
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">
          <FilterChip
            active={!!filters.freeOnly}
            label="Free"
            onClick={() => toggleFilter("freeOnly")}
          />
          <FilterChip
            active={!!filters.ossOnly}
            label="OSS"
            onClick={() => toggleFilter("ossOnly")}
          />
          <FilterChip
            active={!!filters.streamingOnly}
            label="Stream"
            onClick={() => toggleFilter("streamingOnly")}
          />
          {!loading && registry && (
            <span className="ml-auto font-mono text-[9px] normal-case text-text-muted">
              {liveSync ? "Live sync" : syncSource === "live" ? "Live" : "Bundled fallback"} · {modelCount}{" "}
              models
            </span>
          )}
        </div>
      )}

      {syncMessage && (
        <p className="font-mono text-[10px] text-amber-600/90">
          {syncMessage}{" "}
          <button type="button" onClick={() => void reload()} className="underline">
            Retry
          </button>
        </p>
      )}

      {staleValue && (
        <p className="font-mono text-[10px] text-amber-600/90">
          Stale selection — pick a model from the updated list below.
        </p>
      )}

      <Select open={open} onOpenChange={setOpen} value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? "Loading models…" : placeholder} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          className="z-[10000] max-h-[min(28rem,75vh)] bg-neutral-900 text-neutral-100 border border-neutral-800 shadow-2xl rounded-md p-0"
        >
          <div
            className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-900 p-2"
            onPointerDown={(e) => e.preventDefault()}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models…"
                className="w-full border border-neutral-700 bg-neutral-950 py-1.5 pl-8 pr-2 font-mono text-[11px] text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-cyan/40"
                autoComplete="off"
                aria-label="Search models"
              />
            </div>
          </div>

          <div className="max-h-[min(22rem,60vh)] overflow-y-auto p-1">
            {staleValue && !search.trim() && (
              <SelectItem value={value}>
                {value.split(":")[1] ?? value}
                <span className="ml-1 font-mono text-[9px] text-text-muted">STALE</span>
              </SelectItem>
            )}

            {Object.entries(groupedOptions).map(([group, opts]) => (
              <div key={group}>
                <div className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                  {group}
                </div>
                {opts.map((opt) => {
                  const [providerId] = opt.value.split(":");
                  const badges = getModelCapabilities(opt.model);
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="inline-flex items-center flex-wrap gap-0.5">
                        {opt.label}
                        <ModelCapabilityBadges badges={badges} max={3} />
                        {!hasValidKey(providerId) && (
                          <span className="ml-1 font-mono text-[9px] opacity-60">NO KEY</span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </div>
            ))}

            {!loading && Object.keys(groupedOptions).length === 0 && (
              <div className="px-3 py-4 text-center font-mono text-xs text-neutral-500">
                {search.trim()
                  ? `No models match “${search.trim()}”`
                  : syncSource === "offline"
                    ? "Backend unreachable — start server on :8001"
                    : "No models match filters"}
              </div>
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-1.5 py-0.5 transition-colors",
        active
          ? "border-text-secondary text-text-primary bg-bg-paper/50"
          : "border-stroke-subtle hover:border-text-muted"
      )}
    >
      {label}
    </button>
  );
}
