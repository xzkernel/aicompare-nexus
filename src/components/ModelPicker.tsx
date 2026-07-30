import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
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
  disabled?: boolean;
  ariaLabel?: string;
}

export function ModelPicker({
  value,
  onChange,
  placeholder = "Select a model…",
  className = "",
  profileId = "default",
  filters: externalFilters,
  showFilterToggles = true,
  disabled = false,
  ariaLabel = "Model",
}: ModelPickerProps) {
  const { getApiKey } = useSecureApiKeys(profileId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [localFilters, setLocalFilters] = useState<RegistryFilters>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

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
  const navigableOptions = useMemo(
    () => Object.values(groupedOptions).flat(),
    [groupedOptions]
  );

  const selectedOption = registry?.options.find((option) => option.value === value);
  const triggerLabel = selectedOption
    ? selectedOption.label
    : loading
      ? "Loading models…"
      : value.split(":").slice(1).join(":") || placeholder;

  const hasValidKey = (providerId: string): boolean => !!getApiKey(providerId);

  const staleValue = value && registry && !registry.byFullId.has(value);
  const syncSource = registry?.syncSource;
  const modelCount = registry?.options.length ?? 0;
  const liveSync = syncSource === "live" && registry?.openRouterHydrated;

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = navigableOptions.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, navigableOptions, value]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openAbove = spaceBelow < 240 && spaceAbove > spaceBelow;
      const available = openAbove ? spaceAbove : spaceBelow;
      const width = Math.min(rect.width, Math.max(0, window.innerWidth - 16));
      const maxHeight = Math.min(
        448,
        Math.max(0, available),
        Math.max(0, window.innerHeight - 16)
      );
      const desiredTop = openAbove ? rect.top - maxHeight - 4 : rect.bottom + 4;
      const next = {
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: Math.max(8, Math.min(desiredTop, window.innerHeight - maxHeight - 8)),
        width,
        maxHeight,
      };
      setMenuPosition((current) =>
        current &&
        current.left === next.left &&
        current.top === next.top &&
        current.width === next.width &&
        current.maxHeight === next.maxHeight
          ? current
          : next
      );
    };

    const updateOnOutsideScroll = (event: Event) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      updatePosition();
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updateOnOutsideScroll, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updateOnOutsideScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const closeOnFocusOut = (event: FocusEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("focusin", closeOnFocusOut);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("focusin", closeOnFocusOut);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current
      ?.querySelector<HTMLElement>(`[data-model-option-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const syncMessage =
    syncSource === "legacy-backend"
      ? "Backend on :8001 is running an old build (catalog v1 with GPT-4o). Stop that Python/uvicorn window and restart: cd backend && python -m uvicorn main:app --reload --port 8001"
      : syncSource === "offline"
        ? "Cannot reach backend on :8001 — start it with backend\\start.bat, then click Retry."
        : null;

  const toggleFilter = (key: keyof RegistryFilters) => {
    setLocalFilters((f) => ({ ...f, [key]: !f[key] }));
  };

  const selectModel = (nextValue: string) => {
    if (disabled) return;
    onChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveActiveOption = (direction: 1 | -1) => {
    setActiveIndex((current) =>
      Math.max(0, Math.min(navigableOptions.length - 1, current + direction))
    );
  };

  return (
    <div className={cn("relative space-y-2 overflow-visible", className)}>
      {showFilterToggles && (
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">
          <FilterChip
            active={!!filters.freeOnly}
            label="Free"
            disabled={disabled}
            onClick={() => toggleFilter("freeOnly")}
          />
          <FilterChip
            active={!!filters.ossOnly}
            label="OSS"
            disabled={disabled}
            onClick={() => toggleFilter("ossOnly")}
          />
          <FilterChip
            active={!!filters.streamingOnly}
            label="Stream"
            disabled={disabled}
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
          <button type="button" disabled={disabled} onClick={() => void reload()} className="underline">
            Retry
          </button>
        </p>
      )}

      {staleValue && (
        <p className="font-mono text-[10px] text-amber-600/90">
          Stale selection — pick a model from the updated list below.
        </p>
      )}

      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={`${ariaLabel}: ${triggerLabel}`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className="min-w-0 truncate">
          {triggerLabel}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && menuPosition && createPortal(
        <div
          ref={menuRef}
          className="overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl"
          style={{
            position: "fixed",
            zIndex: 10000,
            left: menuPosition.left,
            top: menuPosition.top,
            width: menuPosition.width,
            maxHeight: menuPosition.maxHeight,
          }}
        >
          <div className="border-b border-neutral-800 bg-neutral-900 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
              <input
                ref={searchRef}
                type="search"
                role="combobox"
                aria-controls={listboxId}
                aria-expanded={open}
                aria-autocomplete="list"
                aria-activedescendant={
                  navigableOptions[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined
                }
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setOpen(false);
                    triggerRef.current?.focus();
                  } else if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveActiveOption(1);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveActiveOption(-1);
                  } else if (event.key === "Enter" && navigableOptions[activeIndex]) {
                    event.preventDefault();
                    selectModel(navigableOptions[activeIndex].value);
                  } else if (event.key === "Tab") {
                    setOpen(false);
                  }
                }}
                placeholder="Search models…"
                className="w-full border border-neutral-700 bg-neutral-950 py-1.5 pl-8 pr-2 font-mono text-[11px] text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-cyan/40"
                autoComplete="off"
                aria-label="Search models"
              />
            </div>
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-label="Models"
            className="overflow-y-auto p-1"
            style={{ maxHeight: Math.max(0, menuPosition.maxHeight - 50) }}
          >
            {staleValue && !search.trim() && (
              <ModelOptionButton
                selected
                id={`${listboxId}-stale-option`}
                label={value.split(":").slice(1).join(":") || value}
                onSelect={() => selectModel(value)}
              >
                <span className="ml-1 font-mono text-[9px] text-text-muted">STALE</span>
              </ModelOptionButton>
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
                    <ModelOptionButton
                      key={opt.value}
                      id={`${listboxId}-option-${navigableOptions.findIndex((item) => item.value === opt.value)}`}
                      index={navigableOptions.findIndex((item) => item.value === opt.value)}
                      active={navigableOptions[activeIndex]?.value === opt.value}
                      selected={opt.value === value}
                      label={opt.label}
                      onSelect={() => selectModel(opt.value)}
                      onActivate={() =>
                        setActiveIndex(navigableOptions.findIndex((item) => item.value === opt.value))
                      }
                    >
                      <ModelCapabilityBadges badges={badges} max={3} />
                      {!hasValidKey(providerId) && (
                        <span className="ml-1 font-mono text-[9px] opacity-60">NO KEY</span>
                      )}
                    </ModelOptionButton>
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
        </div>,
        document.body
      )}
    </div>
  );
}

function ModelOptionButton({
  selected,
  active = false,
  id,
  index,
  label,
  onSelect,
  onActivate,
  children,
}: {
  selected: boolean;
  active?: boolean;
  id: string;
  index?: number;
  label: string;
  onSelect: () => void;
  onActivate?: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      data-model-option
      data-model-option-index={index}
      onClick={onSelect}
      onPointerMove={onActivate}
      className={cn(
        "relative flex w-full items-center rounded-sm py-1.5 pl-8 pr-2 text-left text-sm outline-none hover:bg-neutral-800 focus:bg-neutral-800",
        (selected || active) && "bg-neutral-800"
      )}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {selected && <Check className="h-4 w-4" />}
      </span>
      <span className="inline-flex flex-wrap items-center gap-0.5">
        {label}
        {children}
      </span>
    </button>
  );
}

function FilterChip({
  active,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
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
