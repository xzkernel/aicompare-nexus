import { Link } from "react-router-dom";
import { GitCompare, Zap } from "lucide-react";
import { PlaygroundToolbar } from "@/components/comparison/playground/PlaygroundToolbar";
import { LiveResponseDiff } from "@/components/comparison/playground/LiveResponseDiff";
import { computeResponseDiff } from "@/components/comparison/playground/diff-utils";
import type { ModelResponse } from "@/components/comparison/playground/types";
import { cn } from "@/lib/utils";

const DEMO_PROMPT = "Explain why the sky appears blue in simple terms.";

const LEFT: ModelResponse = {
  model: "openai:gpt-5.5",
  status: "complete",
  response:
    "The sky appears blue due to Rayleigh scattering. Shorter blue wavelengths scatter more when sunlight passes through the atmosphere, so we perceive the sky as blue.",
  responseTime: 1840,
};

const RIGHT: ModelResponse = {
  model: "google:gemini-3.1-pro-preview",
  status: "complete",
  response:
    "Sunlight contains many colors. Air molecules scatter shorter blue light more than longer reds, which is why the daytime sky looks blue to our eyes.",
  responseTime: 2120,
};

const diff = computeResponseDiff(LEFT.response, RIGHT.response);

function OutputPreview({
  label,
  text,
  ms,
  segments,
}: {
  label: string;
  text: string;
  ms: number;
  segments: ReturnType<typeof computeResponseDiff>["leftSegments"];
}) {
  return (
    <div className="relative flex min-h-[220px] flex-col bg-[#030303]/95 md:min-h-[260px]">
      <header className="flex items-center justify-between px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-primary/90">{label}</span>
        <span className="font-mono text-[10px] text-accent-cyan/90">{ms}ms</span>
      </header>
      <div className="flex-1 px-5 pb-8 font-mono text-[12px] leading-relaxed text-text-secondary/90">
        {segments.length
          ? segments.map((seg, i) => (
              <span key={i} className={cn(seg.divergent && "mw-diff-divergent bg-accent-red/10")}>
                {seg.text}
              </span>
            ))
          : text}
      </div>
    </div>
  );
}

/** Static workbench demo using illustrative responses. */
export function LandingWorkbenchPreview() {
  return (
    <div className="relative min-h-[560px] overflow-hidden bg-[#0d0d0d]">
      <div className="flex h-8 items-center justify-between bg-black/40 px-5">
        <div className="flex gap-1.5 opacity-70">
          <span className="h-2 w-2 rounded-full bg-accent-red/50" />
          <span className="h-2 w-2 rounded-full bg-accent-yellow/40" />
          <span className="h-2 w-2 rounded-full bg-accent-cyan/50" />
        </div>
        <span className="font-mono text-[9px] tracking-wider text-text-muted/70">
          illustrative demo / comparison
        </span>
        <Link to="/playground" className="font-mono text-[9px] text-accent-cyan/80 hover:text-accent-cyan">
          open playground
        </Link>
      </div>

      <div className="px-4 pt-2 md:px-5">
        <PlaygroundToolbar
          leftModelLabel="OpenAI — GPT-5.5"
          rightModelLabel="Google — Gemini 3.1 Pro"
          isComparing={false}
          leftResponse={LEFT}
          rightResponse={RIGHT}
        />
      </div>

      <div className="px-6 py-4 md:px-8">
        <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-text-muted/60">prompt</p>
        <p className="mt-2 font-mono text-[13px] text-text-primary/95">{DEMO_PROMPT}</p>
      </div>

      <LiveResponseDiff
        divergenceScore={diff.divergenceScore}
        sharedLines={diff.sharedLines}
        totalLines={diff.totalLines}
        leftLatency={LEFT.responseTime}
        rightLatency={RIGHT.responseTime}
        isComparing={false}
      />

      <div className="grid md:grid-cols-2 md:divide-x md:divide-white/[0.04]">
        <OutputPreview
          label="GPT-5.5"
          text={LEFT.response}
          ms={LEFT.responseTime}
          segments={diff.leftSegments}
        />
        <OutputPreview
          label="Gemini 3.1 Pro"
          text={RIGHT.response}
          ms={RIGHT.responseTime}
          segments={diff.rightSegments}
        />
      </div>

      <div className="flex h-7 items-center justify-between bg-black/60 px-5 font-mono text-[9px] text-text-muted/50">
        <span className="flex items-center gap-2">
          <Zap className="h-3 w-3 text-accent-cyan/70" />
          ~{Math.round((LEFT.response.length + RIGHT.response.length) / 4)} tok
        </span>
        <span className="flex items-center gap-1.5 text-accent-cyan/70">
          <GitCompare className="h-3 w-3" />
          sample complete
        </span>
      </div>
    </div>
  );
}
