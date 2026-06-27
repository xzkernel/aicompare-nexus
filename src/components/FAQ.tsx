import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Stitch structure: flex-row, w-1/3 heading + w-2/3 accordion list.
 * Border-top on the 2/3 column, border-bottom per item.
 */

const FAQS = [
  {
    q: "How is ModelWise different from OpenRouter?",
    a: "ModelWise is an orchestration tool, not just an API proxy. We focus on side-by-side benchmarking, visual diffs, and local execution monitoring rather than unified billing.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. API keys are stored in memory and never sent to ModelWise servers. Prompts go directly to the provider you configure. Sessions persist only in your browser's local storage.",
  },
  {
    q: "Can I host this on-premise?",
    a: "Yes. Deploy ModelWise as a Docker container within your secure infrastructure for total data sovereignty. Run `modelwise up --self-host` to get started.",
  },
  {
    q: "Which models are supported?",
    a: "OpenAI GPT, Anthropic Claude, Google Gemini, Meta Llama via relay, and custom HTTP endpoints. See the provider registry in Settings.",
  },
  {
    q: "Can I export comparison history?",
    a: "Yes — JSON or CSV from Settings → Sessions. Import restores history into local storage.",
  },
  {
    q: "Is there a usage limit?",
    a: "ModelWise imposes none. Provider quotas and billing apply to your own API accounts.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="bg-[#0c0f0f] px-[40px] py-[48px]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-[48px] md:flex-row">

        {/* 1/3 heading column */}
        <div className="w-full md:w-1/3">
          <h2 className="landing-serif-display text-[32px] leading-[1.2] tracking-[-0.02em] text-white">
            Queries.
          </h2>
        </div>

        {/* 2/3 accordion — top border, items have bottom border */}
        <div className="w-full border-t border-white/10 md:w-2/3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b border-white/10 py-6">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full cursor-pointer items-center justify-between text-left"
                >
                  <h4 className="text-[18px] font-semibold text-white">{item.q}</h4>
                  <span className="ml-8 shrink-0 font-mono text-lg text-white/40 transition-transform duration-200" style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
                    +
                  </span>
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-[max-height] duration-300",
                    isOpen ? "max-h-48" : "max-h-0"
                  )}
                >
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/50">{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
