import { config } from "@/config/app";

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col justify-center overflow-hidden px-[40px] pb-[48px] pt-48 landing-dot-grid">
      <div className="landing-radial-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-[1440px]">
        <h1 className="relative flex select-none flex-col gap-0">
          <span className="landing-serif-display block text-[13vw] leading-none tracking-[-0.04em] text-white md:-translate-x-1 md:text-[180px]">
            compare
          </span>
          <span className="landing-serif-display block text-[13vw] italic leading-none tracking-[-0.04em] text-[#5de6ff]/90 md:ml-[25%] md:text-[180px]">
            models
          </span>
          <span className="landing-serif-display block text-[13vw] leading-none tracking-[-0.04em] text-white md:ml-[10%] md:-translate-y-5 md:text-[180px]">
            instantly.
          </span>

          <span
            aria-hidden
            className="landing-hero-ghost landing-serif-display pointer-events-none absolute top-[-40px] left-[10%] text-[13vw] opacity-20 md:text-[180px]"
          >
            compare
          </span>
          <span
            aria-hidden
            className="landing-hero-ghost landing-serif-display pointer-events-none absolute bottom-[-40px] right-[5%] text-[13vw] italic opacity-20 md:text-[180px]"
          >
            models
          </span>
        </h1>

        <div className="mt-[48px] max-w-xl md:ml-[40%]">
          <p className="mb-[16px] font-mono text-[14px] font-light leading-relaxed text-white/50">
            The orchestration layer for frontier intelligence. Run the same prompt across GPT, Claude,
            and Gemini simultaneously and inspect the responses side by side.
          </p>
          <div className="flex items-center gap-[16px]">
            <span className="border border-[#5de6ff]/30 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[#5de6ff]">
              v{config.APP_VERSION} PRE-RELEASE
            </span>
            <span className="font-mono text-[10px] text-white/40">
              Available via Docker · BYOK
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
