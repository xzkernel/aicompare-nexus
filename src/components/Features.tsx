import { BarChart2, KeyRound, Terminal, Layers } from "lucide-react";

/**
 * Stitch: py-stack-lg px-margin-safe, flex md:flex-row gap-stack-lg.
 * 1/3 sticky headline col, 2/3 grid-cols-2 card mosaic, gap-stack-md.
 * Cards: terminal-border bg-[#050505] p-gutter h-64/h-80, card 3 md:-mt-16.
 */

const CARDS = [
  {
    id: "compare",
    Icon: BarChart2,
    title: "Side-by-Side Comparison",
    body: "Real-time lateral visual benchmarks across models simultaneously with custom diff highlighting.",
    height: "h-64",
    stagger: "",
    snippet: null,
  },
  {
    id: "key",
    Icon: KeyRound,
    title: "Bring Your Own Key",
    body: "We never store your keys. All orchestration happens locally with direct provider routing.",
    height: "h-80",
    stagger: "",
    snippet: null,
  },
  {
    id: "terminal",
    Icon: Terminal,
    title: "Self-Hosting",
    body: "Deploy as a Docker container within your secure infrastructure for total data sovereignty.",
    height: "h-80",
    stagger: "md:-mt-16",
    snippet: "$ modelwise up --self-host\n> Initializing local container...\n> Node active at port 4000",
  },
  {
    id: "layers",
    Icon: Layers,
    title: "Metadata Analysis",
    body: "Analyze latency, token usage, and cost-per-execution before moving to production scaling.",
    height: "h-64",
    stagger: "",
    snippet: null,
  },
];

export function Features() {
  return (
    <section id="features" className="px-[40px] py-[48px]">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-[48px] md:flex-row">

          {/* 1/3: sticky headline column — Stitch exact */}
          <div className="w-full md:w-1/3">
            <div className="sticky top-32">
              <h2 className="landing-serif-display text-[32px] leading-[1.2] tracking-[-0.02em] text-white">
                Technical<br />Capabilities.
              </h2>
              <p className="mt-[16px] max-w-xs text-sm text-white/50">
                Built for architects who demand deterministic outputs from probabilistic systems.
              </p>
            </div>
          </div>

          {/* 2/3: card mosaic — Stitch exact */}
          <div className="grid w-full grid-cols-1 gap-[16px] md:w-2/3 md:grid-cols-2">
            {CARDS.map((card) => (
              <div
                key={card.id}
                className={`terminal-border flex flex-col justify-between bg-[#050505] p-[24px] transition-colors hover:border-white/20 ${card.height} ${card.stagger}`}
              >
                <card.Icon className="h-5 w-5 text-white" strokeWidth={1.5} />
                <div>
                  {card.snippet && (
                    <div className="mb-4 border border-white/5 bg-black/50 p-2 font-mono text-[10px] leading-relaxed text-white/50">
                      {card.snippet}
                    </div>
                  )}
                  <h3 className="mb-2 text-[18px] font-semibold leading-snug text-white">
                    {card.title}
                  </h3>
                  <p className="text-sm text-white/50">{card.body}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
