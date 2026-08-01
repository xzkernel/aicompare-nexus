import { useTranslation } from "react-i18next";
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { SETTINGS_SECTION_IDS, type SettingsSectionId } from "./settings-sections";

type SettingsLayoutProps = {
  activeSection: SettingsSectionId;
  onSectionChange: (id: SettingsSectionId) => void;
  hasValidKeys: boolean;
  routesConfiguredCount: number;
  children: React.ReactNode;
};

export function SettingsLayout({
  activeSection,
  onSectionChange,
  hasValidKeys,
  routesConfiguredCount,
  children,
}: SettingsLayoutProps) {
  const { t } = useTranslation();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectTabFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    const rtl = document.documentElement.dir === "rtl";
    if (event.key === "ArrowRight") nextIndex = index + (rtl ? -1 : 1);
    if (event.key === "ArrowLeft") nextIndex = index + (rtl ? 1 : -1);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = SETTINGS_SECTION_IDS.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const wrappedIndex = (nextIndex + SETTINGS_SECTION_IDS.length) % SETTINGS_SECTION_IDS.length;
    const sectionId = SETTINGS_SECTION_IDS[wrappedIndex];
    onSectionChange(sectionId);
    tabRefs.current[wrappedIndex]?.focus();
  };

  return (
    <div>
      <div className="mb-[24px] flex min-w-0 flex-col gap-3 border-b border-white/[0.06] pb-[16px] sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-mono text-2xl font-bold text-white">{t("settings.controlCenter")}</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/50">
            {t("settings.subtitle")} ·{" "}
            {t("settings.routesConfigured", { count: routesConfiguredCount })}
            {hasValidKeys ? ` · ${t("settings.keyPresent")}` : ` · ${t("settings.keysRequired")}`}
          </p>
        </div>

        <div className="flex max-w-full overflow-x-auto border border-white/[0.06] bg-[#0e0e0e] p-1" role="tablist" aria-orientation="horizontal" aria-label={t("settings.sectionsLabel")}>
          {SETTINGS_SECTION_IDS.map((sectionId, index) => (
            <button
              ref={(node) => { tabRefs.current[index] = node; }}
              key={sectionId}
              id={`settings-tab-${sectionId}`}
              type="button"
              role="tab"
              aria-selected={activeSection === sectionId}
              aria-controls={`settings-panel-${sectionId}`}
              tabIndex={activeSection === sectionId ? 0 : -1}
              onClick={() => onSectionChange(sectionId)}
              onKeyDown={(event) => selectTabFromKeyboard(event, index)}
              className={cn(
                "shrink-0 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
                activeSection === sectionId
                  ? "border border-[#5de6ff]/20 bg-white/5 text-[#5de6ff]"
                  : "text-white/50 hover:text-white"
              )}
            >
              {t(`settings.sections.${sectionId}.label`)}
            </button>
          ))}
        </div>
      </div>

      <div
        id={`settings-panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`settings-tab-${activeSection}`}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}

export function SettingsPanel({
  title,
  description,
  icon: Icon,
  status,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  status?: { label: string; ok: boolean };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border border-stroke-subtle bg-bg-paper/20", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-stroke-subtle px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.75} />}
            <h2 className="font-mono text-[12px] text-text-primary">{title}</h2>
          </div>
          {description && <p className="mt-0.5 font-mono text-[10px] text-text-muted">{description}</p>}
        </div>
        {status && (
          <span
            className={cn(
              "mw-label-mono shrink-0 rounded px-1.5 py-0.5 ring-1",
              status.ok ? "text-accent-green ring-accent-green/30" : "text-text-muted ring-stroke-subtle"
            )}
          >
            {status.label}
          </span>
        )}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function SettingsKeyField({
  id,
  label,
  hint,
  value,
  placeholder,
  visible = false,
  onToggleVisible,
  onChange,
  valid,
  helpUrl,
  hideable = true,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  placeholder: string;
  visible?: boolean;
  onToggleVisible?: () => void;
  onChange: (value: string) => void;
  valid?: boolean;
  helpUrl?: string;
  hideable?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="mw-label-mono text-text-muted">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {valid !== undefined && (
            <span
              className={cn(
                "font-mono text-[10px]",
                valid ? "text-accent-green" : value ? "text-accent-red" : "text-text-muted"
              )}
            >
              {valid ? "configured" : "missing"}
            </span>
          )}
          {helpUrl && (
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-accent-cyan hover:underline"
            >
              docs
            </a>
          )}
        </div>
      </div>
      <div className="relative">
        <input
          id={id}
          type={!hideable || visible ? "text" : "password"}
          dir={hideable ? "ltr" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full border border-stroke-subtle bg-bg-soft px-3 py-2 font-mono text-[12px] text-text-primary placeholder:text-text-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-cyan/40",
            hideable && "pe-16"
          )}
          autoComplete="off"
        />
        {hideable && (
          <button
            type="button"
            onClick={onToggleVisible}
            className="absolute end-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted hover:text-text-primary"
            aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          >
            {visible ? "hide" : "show"}
          </button>
        )}
      </div>
      {hint && <p className="font-mono text-[10px] text-text-muted">{hint}</p>}
    </div>
  );
}

export function RoutingToggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="mw-label-mono text-text-muted">{label}</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex-1 border px-2 py-1.5 font-mono text-[10px] transition-colors",
              value === opt.id || (!value && opt.id === options[0]?.id)
                ? "border-accent-cyan/40 bg-brand-100/60 text-text-primary"
                : "border-stroke-subtle bg-bg-soft text-text-muted hover:text-text-secondary"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
