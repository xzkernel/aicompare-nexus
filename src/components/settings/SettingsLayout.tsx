import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type SettingsSectionId =
  | "profiles"
  | "providers"
  | "api-keys"
  | "storage"
  | "cloud"
  | "sessions"
  | "cost"
  | "security";

export const SETTINGS_SECTION_IDS: SettingsSectionId[] = [
  "profiles",
  "providers",
  "api-keys",
  "storage",
  "cloud",
  "sessions",
  "cost",
  "security",
];

type SettingsLayoutProps = {
  activeSection: SettingsSectionId;
  onSectionChange: (id: SettingsSectionId) => void;
  hasValidKeys: boolean;
  connectedCount: number;
  children: React.ReactNode;
};

/**
 * Stitch layout: "Control Center" heading + horizontal tab row, full-width content below.
 */
export function SettingsLayout({
  activeSection,
  onSectionChange,
  hasValidKeys,
  connectedCount,
  children,
}: SettingsLayoutProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-[24px] flex items-end justify-between border-b border-white/[0.06] pb-[16px]">
        <div>
          <h2 className="font-mono text-2xl font-bold text-white">{t("settings.controlCenter")}</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/50">
            {t("settings.subtitle")} ·{" "}
            {t("settings.providersConnected", { count: connectedCount })}
            {hasValidKeys ? ` · ${t("settings.ready")}` : ` · ${t("settings.keysRequired")}`}
          </p>
        </div>

        <div className="flex border border-white/[0.06] bg-[#0e0e0e] p-1">
          {SETTINGS_SECTION_IDS.map((sectionId) => (
            <button
              key={sectionId}
              type="button"
              onClick={() => onSectionChange(sectionId)}
              className={cn(
                "px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
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

      {/* Full-width content */}
      <div>{children}</div>
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
            {Icon && <Icon className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.75} />}
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
  visible,
  onToggleVisible,
  onChange,
  valid,
  helpUrl,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onToggleVisible: () => void;
  onChange: (value: string) => void;
  valid?: boolean;
  helpUrl?: string;
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
              {valid ? "valid" : value ? "invalid" : "empty"}
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
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-stroke-subtle bg-bg-soft px-3 py-2 pr-16 font-mono text-[12px] text-text-primary placeholder:text-text-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-cyan/40"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted hover:text-text-primary"
        >
          {visible ? "hide" : "show"}
        </button>
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
