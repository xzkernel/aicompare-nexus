import { BarChart2, KeyRound, Terminal, Layers } from "lucide-react";

const CARDS = [
  {
    id: "compare",
    Icon: BarChart2,
    title: "Side-by-Side Comparison",
    body: "Stream responses from two models side by side with line-level diff highlighting.",
    height: "h-64",
    stagger: "",
    snippet: null,
  },
  {
    id: "key",
    Icon: KeyRound,
    title: "Bring Your Own Key",
    body: "Keys are memory-only by default and transit your configured ModelWise backend per request. Optional encrypted vault storage is explicit.",
    height: "h-80",
    stagger: "",
    snippet: null,
  },
  {
    id: "terminal",
    Icon: Terminal,
    title: "Self-Hosting",
    body: "Deploy the frontend and backend on your infrastructure while continuing to route requests to your selected external providers.",
    height: "h-80",
    stagger: "md:-mt-16",
    snippet: "$ docker compose -f docker-compose.prod.yml up -d --build\n> Frontend: 127.0.0.1:8080\n> Backend: internal network",
  },
  {
    id: "layers",
    Icon: Layers,
    title: "Comparison Signals",
    body: "Review response latency, estimated output length, and line-level divergence for each comparison.",
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

          <div className="w-full md:w-1/3">
            <div className="sticky top-32">
              <h2 className="landing-serif-display text-[32px] leading-[1.2] tracking-[-0.02em] text-white">
                Technical<br />Capabilities.
              </h2>
              <p className="mt-[16px] max-w-xs text-sm text-white/50">
                Built for teams comparing probabilistic model responses in one consistent workflow.
              </p>
            </div>
          </div>

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
