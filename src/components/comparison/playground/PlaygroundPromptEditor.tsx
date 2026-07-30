import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowRight, Eraser, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptTemplates } from "@/components/PromptTemplates";
import { cn } from "@/lib/utils";
import type { CompareExecutionState } from "@/lib/compare-execution-state";
import { estimateTokens } from "./types";

type PlaygroundPromptEditorProps = {
  prompt: string;
  onChange: (value: string) => void;
  onCompare: () => void;
  onCancel?: () => void;
  onClear: () => void;
  isComparing: boolean;
  isFinalizing: boolean;
  compareExecution: CompareExecutionState;
  leftProvider: string;
  rightProvider: string;
};

const PRESETS = [
  { key: "reasoning", prefix: "Reasoning:\n" },
  { key: "benchmark", prefix: "Evaluate and score (1-10):\n" },
  { key: "structured", prefix: "Respond in JSON with keys: answer, confidence, reasoning.\n\n" },
] as const;

export function PlaygroundPromptEditor({
  prompt,
  onChange,
  onCompare,
  onCancel,
  onClear,
  isComparing,
  isFinalizing,
  compareExecution,
  leftProvider,
  rightProvider,
}: PlaygroundPromptEditorProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tokens = estimateTokens(prompt);
  const charCount = prompt.length;
  const { runnable, blockingReason, warnings } = compareExecution;
  const canRun = runnable && !isComparing;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (canRun) onCompare();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canRun, onCompare]);

  return (
    <section className="border border-stroke-strong bg-bg-paper/35 shadow-surface">
      <fieldset disabled={isComparing} className="contents">
      <div className="flex flex-col gap-2 border-b border-stroke-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="mw-label-mono text-text-muted">{t("playground.promptWorkspace")}</span>
          <span className="font-mono text-[10px] text-text-muted">
            {t("playground.charTokens", { chars: charCount, tokens })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <PromptTemplates onSelectTemplate={(t) => onChange(t.prompt)} />
          {PRESETS.map((p) => (
            <Button
              key={p.key}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] font-medium text-text-muted hover:text-text-primary"
              onClick={() => onChange(p.prefix + prompt)}
            >
              {t(`playground.presets.${p.key}`)}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-text-muted"
            onClick={onClear}
            title={t("playground.clearPrompt")}
          >
            <Eraser className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 border-r border-stroke-subtle/50 bg-bg-paper/30"
        />
        <textarea
          ref={textareaRef}
          value={prompt}
          aria-label="Comparison prompt"
          disabled={isComparing}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "min-h-[210px] w-full resize-y bg-transparent py-4 pl-10 pr-4 text-[15px] leading-7",
            "text-text-primary placeholder:text-text-muted/60",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-cyan/30"
          )}
          placeholder={t("playground.placeholder")}
          spellCheck
        />
      </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stroke-subtle px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-text-muted">
          <span className="rounded px-1.5 py-0.5 ring-1 ring-stroke-subtle">{leftProvider}</span>
          <span>+</span>
          <span className="rounded px-1.5 py-0.5 ring-1 ring-stroke-subtle">{rightProvider}</span>
          <span className="hidden sm:inline">· {t("playground.shortcut")}</span>
        </div>
        {isComparing && onCancel ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="h-8 text-[11px] font-medium text-text-muted hover:text-accent-red"
          >
            {t("playground.cancel")}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant={canRun ? "primary" : "secondary"}
          onClick={onCompare}
          disabled={!canRun}
          title={!canRun && blockingReason ? t(blockingReason) : undefined}
          className={cn(
            "h-9 gap-1.5 px-4 text-[12px] font-semibold",
            canRun && "shadow-soft",
            !canRun && "cursor-not-allowed opacity-60"
          )}
        >
          {isFinalizing
            ? "Saving…"
            : isComparing
              ? t("playground.streaming")
              : t("playground.runComparison")}
          {canRun && <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />}
        </Button>
      </div>

      {!canRun && blockingReason && !isComparing ? (
        <p className="border-t border-stroke-subtle px-3 py-1.5 text-xs text-text-muted">
          {t(blockingReason)}
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <div className="flex items-start gap-1.5 border-t border-stroke-subtle px-3 py-1.5">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-accent-yellow" strokeWidth={1.75} />
          <ul className="space-y-0.5 text-xs text-text-muted">
            {warnings.map((warning) => (
              <li key={warning}>{t(warning)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Security metadata strip — LLM02/LLM06 UX (Phase 12) */}
      <div className="flex items-center gap-4 border-t border-stroke-subtle/50 px-3 py-1.5">
        <div className="flex items-center gap-1 font-mono text-[9px] text-text-muted/60">
          <Lock className="h-2.5 w-2.5" strokeWidth={1.5} />
          <span>{t("playground.securityKeysLocal")}</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[9px] text-text-muted/60">
          <ShieldAlert className="h-2.5 w-2.5" strokeWidth={1.5} />
          <span>{t("playground.securityUntrustedOutput")}</span>
        </div>
      </div>
    </section>
  );
}
