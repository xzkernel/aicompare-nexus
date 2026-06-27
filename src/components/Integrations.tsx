/**
 * Stitch: py-stack-lg px-margin-safe. max-w-container-max.
 * No section header above the table — table starts immediately.
 * 4-column grid: Provider | Supported Models | Routing Protocol | Status.
 * Footer: "REQUESTS NEVER STORED" left + "SECURE END-TO-END ENCRYPTION" right.
 */

const PROVIDER_ROWS = [
  {
    name: "OpenAI",
    models: "GPT-4o, GPT-5, o1-preview",
    routing: "DIRECT_REST_API",
  },
  {
    name: "Anthropic",
    models: "Claude 3.5 Sonnet, Claude 3 Opus",
    routing: "WEBSOCKET_STREAM",
  },
  {
    name: "Google",
    models: "Gemini 1.5 Pro, Gemini 1.5 Flash",
    routing: "DIRECT_REST_API",
  },
  {
    name: "Meta / Llama",
    models: "Llama 3.1 8B, 70B, 405B",
    routing: "LOCAL_OLLAMA_PROXY",
  },
];

export function Integrations() {
  return (
    <section className="px-[40px] py-[48px]">
      <div className="mx-auto max-w-[1440px]">

        <div className="terminal-border overflow-hidden">
          {/* Header row — Stitch: 4-col, bg-surface-container-low */}
          <div className="grid grid-cols-1 border-b border-white/10 bg-[#1c1b1b] md:grid-cols-4">
            <div className="border-r border-white/10 p-[24px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white">Provider</span>
            </div>
            <div className="border-r border-white/10 p-[24px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white">Supported Models</span>
            </div>
            <div className="border-r border-white/10 p-[24px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white">Routing Protocol</span>
            </div>
            <div className="p-[24px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white">Status</span>
            </div>
          </div>

          {/* Data rows — Stitch: 4-col, provider name text-body-lg (24px) */}
          {PROVIDER_ROWS.map((row) => (
            <div
              key={row.name}
              className="grid grid-cols-1 border-b border-white/10 transition-colors hover:bg-[#0a0a0a] md:grid-cols-4"
            >
              <div className="border-r border-white/10 p-[24px] text-[24px] text-white">
                {row.name}
              </div>
              <div className="border-r border-white/10 p-[24px] text-sm text-white/50">
                {row.models}
              </div>
              <div className="border-r border-white/10 p-[24px] font-mono text-[10px] text-white/50">
                {row.routing}
              </div>
              <div className="flex items-center gap-2 p-[24px]">
                <span className="h-2 w-2 rounded-full bg-[#5de6ff]" />
                <span className="font-mono text-[11px] text-white">OPERATIONAL</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer row — Stitch exact */}
        <div className="mt-[16px] flex items-center justify-between font-mono text-[10px] text-white/30">
          <span>REQUESTS NEVER STORED ON OUR SERVERS</span>
          <span>SECURE END-TO-END ENCRYPTION</span>
        </div>

      </div>
    </section>
  );
}
