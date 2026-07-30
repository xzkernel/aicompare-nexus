import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function LandingHeader() {
  const { t } = useTranslation();

  return (
    <header className="fixed left-1/2 top-[16px] z-50 w-[95%] max-w-[1440px] -translate-x-1/2">
      <nav className="flex h-[44px] items-center justify-between rounded-full border border-white/[0.08] bg-black/80 px-[24px] backdrop-blur-xl">
        <Link to="/" className="landing-serif-display text-2xl tracking-tight text-white">
          ModelWise
        </Link>

        <div className="hidden items-center gap-[24px] md:flex">
          <Link
            to="/playground"
            className="rounded-full px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-white/50 transition-all hover:bg-white/5 hover:text-white"
          >
            {t("nav.playground")}
          </Link>
          <a
            href="#features"
            className="border-b border-white pb-0.5 font-mono text-[10px] uppercase tracking-widest text-white"
          >
            {t("nav.compare")}
          </a>
          <a
            href="https://github.com/Archiixyz/aicompare-nexus#quick-start"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-white/50 transition-all hover:bg-white/5 hover:text-white"
          >
            {t("nav.quickstart")}
          </a>
          <a
            href="https://github.com/Archiixyz/aicompare-nexus"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-white/50 transition-all hover:bg-white/5 hover:text-white"
          >
            {t("nav.github")}
          </a>
        </div>

        <div className="flex items-center gap-[8px]">
          <LanguageSwitcher variant="landing" />
          <Link
            to="/playground"
            className="bg-white px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-black transition-transform duration-150 active:scale-95 hover:bg-[#5de6ff]"
          >
            {t("nav.getStarted")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
