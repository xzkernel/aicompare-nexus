import { useState } from "react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How is ModelWise different from OpenRouter?",
    a: "ModelWise is an evaluation workbench rather than a unified billing API. It focuses on side-by-side streaming comparisons, visual diffs, and browser session tools while routing inference through the configured backend.",
  },
  {
    q: "Is my data secure?",
    a: "API keys are memory-only by default. Keys and prompts transit the ModelWise backend you configure, which does not intentionally persist keys, before requests reach external providers. An encrypted device vault is optional, and completed comparisons are automatically saved to browser IndexedDB.",
  },
  {
    q: "Can I host this on-premise?",
    a: "Yes. Deploy ModelWise on your infrastructure with `docker compose -f docker-compose.prod.yml up -d --build`. You control the ModelWise services, while configured external AI providers still receive routed prompts and requests.",
  },
  {
    q: "Which models are supported?",
    a: "OpenAI GPT, Anthropic Claude, Google Gemini, OpenCode Go and Zen, Meta Llama via relay, and custom HTTP endpoints. See the provider registry in Settings.",
  },
  {
    q: "Can I export comparison history?",
    a: "Yes. Export JSON or CSV from Settings → Sessions. Import restores history into browser IndexedDB.",
  },
  {
    q: "Is there a usage limit?",
    a: "Limits depend on the ModelWise deployment and your providers. Provider quotas, rate limits, and billing apply to your API accounts.",
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
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                  className="flex w-full cursor-pointer items-center justify-between text-start"
                >
                  <h4 className="text-[18px] font-semibold text-white">{item.q}</h4>
                  <span className="ml-8 shrink-0 font-mono text-lg text-white/40 transition-transform duration-200" style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
                    +
                  </span>
                </button>
                <div
                  id={`faq-answer-${i}`}
                  aria-hidden={!isOpen}
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
