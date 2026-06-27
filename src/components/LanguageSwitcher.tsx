import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/contexts/LocaleProvider";
import type { AppLocale } from "@/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: AppLocale[] = ["en", "fr", "ar"];

type LanguageSwitcherProps = {
  className?: string;
  variant?: "shell" | "landing";
};

export function LanguageSwitcher({ className, variant = "shell" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();

  const triggerClass =
    variant === "landing"
      ? "flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/60 transition-opacity hover:opacity-80"
      : "flex items-center gap-1.5 border border-white/[0.08] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/60 hover:text-white hover:border-white/20";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn(triggerClass, className)} aria-label={t("language.label")}>
          <Languages className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>{t(`language.${locale}`)}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="font-mono text-xs">
        {OPTIONS.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => void setLocale(code)}
            className={cn(locale === code && "text-accent-cyan")}
          >
            {t(`language.${code}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
