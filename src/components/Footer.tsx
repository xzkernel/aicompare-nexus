import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const REPO = "https://github.com/xzkernel/aicompare-nexus";

export const Footer = () => {
  const { t } = useTranslation();

  const links = {
    app: [
      { label: t("nav.playground"), href: "/playground", internal: true },
      { label: t("nav.settings"), href: "/settings", internal: true },
    ],
    project: [
      { label: t("nav.github"), href: REPO, internal: false },
      { label: t("nav.quickstart"), href: `${REPO}#quick-start`, internal: false },
      { label: t("footer.selfHosting"), href: `${REPO}/blob/main/docs/SELF_HOSTING.md`, internal: false },
      { label: t("footer.privacy"), href: `${REPO}/blob/main/docs/PRIVACY.md`, internal: false },
      { label: t("footer.security"), href: `${REPO}/blob/main/SECURITY.md`, internal: false },
    ],
  };

  return (
    <footer className="border-t border-white/10 bg-[#0e0e0e] px-[40px] py-[48px]">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-24 flex flex-col items-start justify-between gap-[48px] md:flex-row">
          <div className="flex flex-col gap-[8px]">
            <Link to="/" className="landing-serif-display text-2xl tracking-tight text-white">
              ModelWise
            </Link>
            <p className="max-w-xs font-mono text-[11px] leading-relaxed text-white/40">
              {t("footer.tagline")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12">
            {Object.entries(links).map(([section, items]) => (
              <div key={section} className="flex flex-col gap-4">
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-white">
                  {section === "app" ? t("footer.app") : t("footer.project")}
                </span>
                {items.map((item) =>
                  item.internal ? (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="font-mono text-[11px] text-white/40 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-white/40 transition-colors hover:text-white"
                    >
                      {item.label}
                    </a>
                  )
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/30">
            © 2026 MODELWISE RESEARCH. {t("footer.rights").toUpperCase()}
          </span>
          <div className="flex gap-[16px] font-mono text-[10px] text-white/30">
            <span>OPEN-SOURCE</span>
            <span>•</span>
            <span>MIT LICENSED</span>
            <span>•</span>
            <span>SELF-HOSTABLE</span>
            <span>•</span>
            <span>BYOK</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
