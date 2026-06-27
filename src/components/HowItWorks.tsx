import { Link } from "react-router-dom";

/**
 * Stitch: py-stack-lg px-margin-safe bg-surface-container-lowest (#0e0e0e).
 * max-w-4xl, h2 centered mb-stack-lg.
 * Vertical line, space-y-24, w-5/12 text cols, w-10 h-10 rounded-full nodes.
 */

const STEPS = [
  {
    n: "01",
    title: "Enter Prompt",
    body: "Define your requirements in pure markdown or JSON schema.",
    side: "left" as const,
  },
  {
    n: "02",
    title: "Select Models",
    body: "Toggle between OpenAI, Anthropic, Gemini, or local Llama instances.",
    side: "right" as const,
  },
  {
    n: "03",
    title: "Run Comparison",
    body: "Execute in parallel with real-time streaming tokens and visual diffs.",
    side: "left" as const,
  },
  {
    n: "04",
    title: "Export Analysis",
    body: "Save benchmark reports as JSON or re-open sessions from history.",
    side: "right" as const,
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[#0e0e0e] px-[40px] py-[48px]">
      <div className="mx-auto max-w-4xl">

        {/* Stitch: centered h2, mb-stack-lg */}
        <h2 className="landing-serif-display mb-[48px] text-center text-[32px] leading-[1.2] tracking-[-0.02em] text-white">
          The Workflow.
        </h2>

        <div className="relative space-y-24">
          {/* Vertical center line */}
          <div
            aria-hidden
            className="landing-step-line absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2"
          />

          {STEPS.map((step) => (
            <div key={step.n} className="relative flex items-center justify-between">
              {step.side === "left" ? (
                <>
                  <div className="w-5/12 text-right">
                    <h4 className="text-[18px] font-semibold text-white">{step.title}</h4>
                    <p className="mt-1 text-sm text-white/50">{step.body}</p>
                  </div>
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white bg-black font-mono text-[11px] text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    {step.n}
                  </div>
                  <div className="w-5/12" />
                </>
              ) : (
                <>
                  <div className="w-5/12" />
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black font-mono text-[11px] text-white">
                    {step.n}
                  </div>
                  <div className="w-5/12">
                    <h4 className="text-[18px] font-semibold text-white">{step.title}</h4>
                    <p className="mt-1 text-sm text-white/50">{step.body}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <Link
            to="/settings"
            className="font-mono text-[10px] text-white/30 transition-colors hover:text-[#5de6ff]"
          >
            configure providers →
          </Link>
        </div>

      </div>
    </section>
  );
}
