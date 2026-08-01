import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { config } from "@/config/app";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ByokInfrastructurePanel } from "@/components/shell/ByokInfrastructurePanel";
import { RegistryBootstrap } from "@/components/RegistryBootstrap";
import { BackendStatusBanner } from "@/components/BackendStatusBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const NAV_ITEMS = [
  { key: "playground", path: "/playground" },
  { key: "providers", path: "/settings?section=providers" },
  { key: "settings", path: "/settings?section=api-keys" },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const settingsSection = new URLSearchParams(location.search).get("section");

  const isActive = (path: string | null) => {
    if (!path) return false;
    const [pathname, query] = path.split("?");
    if (location.pathname !== pathname) return false;
    if (!query) return true;
    const expected = new URLSearchParams(query);
    const current = new URLSearchParams(location.search);
    return [...expected].every(([key, value]) => current.get(key) === value);
  };

  const sidebarContent = (
    <>
      <div className="p-[24px]">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-white">
            <span className="font-mono text-xs font-bold text-black">MW</span>
          </div>
          <div>
            <h1 className="font-mono text-base font-bold leading-none tracking-tight text-white">
              ModelWise
            </h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
              V{config.APP_VERSION} Pre-release
            </p>
          </div>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
                key={item.key}
                to={item.path}
                onClick={isMobile ? () => setMobileOpen(false) : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 font-mono text-xs tracking-tight transition-colors",
                  isActive(item.path) ||
                  (item.key === "settings" &&
                    location.pathname === "/settings" &&
                    settingsSection !== "providers")
                    ? "border-s-2 border-[#5de6ff] bg-[#5de6ff]/5 text-[#5de6ff]"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                )}
              >
                {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>

      </div>

      <ByokInfrastructurePanel collapsed={false} />

      <div className="mt-auto border-t border-white/[0.06] p-[24px]">
        <a
          href="https://github.com/xzkernel/aicompare-nexus"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 font-mono text-xs text-white/40 transition-colors hover:text-white"
        >
          {t("nav.docs")}
        </a>
        <a
          href="https://github.com/xzkernel/aicompare-nexus/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 font-mono text-xs text-white/40 transition-colors hover:text-white"
        >
          {t("nav.support")}
        </a>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <RegistryBootstrap />
      <BackendStatusBanner />
      <div className="landing-grain" aria-hidden />

      {!isMobile && (
        <aside className="shell-sidebar fixed start-0 top-0 z-50 flex h-screen w-64 flex-col overflow-y-auto border-e border-white/[0.06] bg-[#0e0e0e]">
          {sidebarContent}
        </aside>
      )}

      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-64 border-white/[0.06] bg-[#0e0e0e] p-0"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Main application navigation</SheetDescription>
            <div className="flex h-full flex-col">{sidebarContent}</div>
          </SheetContent>
        </Sheet>
      )}

      <header
        className={cn(
          "shell-header fixed top-0 end-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#131313]/60 px-[24px] backdrop-blur-2xl",
          isMobile ? "start-0" : "shell-header-offset"
        )}
      >
        <div className="flex items-center gap-8">
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="text-white/50 hover:text-white"
              aria-label={t("nav.openNav")}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white">
            ModelWise // FRONTIER
          </span>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/playground"
              className={cn(
                "font-mono text-xs transition-colors",
                location.pathname === "/playground"
                  ? "font-bold text-white"
                  : "text-white/50 hover:text-white"
              )}
            >
              {t("nav.playground")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <span className="rounded px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-accent-green ring-1 ring-accent-green/30">
            Local only
          </span>
        </div>
      </header>

      <main
        className={cn(
          "shell-main min-h-screen pt-16 perspective-grid",
          !isMobile && "shell-main-offset"
        )}
      >
        <div className="mx-auto max-w-[1440px] p-[24px]">{children}</div>
      </main>
    </div>
  );
}
