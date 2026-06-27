import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#131313] text-[#e5e2e1]">
      <div className="max-w-md border border-white/[0.08] bg-[#0e0e0e] p-8 text-center font-mono">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">{t("notFound.code")}</p>
        <h1 className="mt-2 text-lg font-bold text-white">{t("notFound.title")}</h1>
        <p className="mt-2 text-xs text-white/50 break-all">{location.pathname}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="border border-white/[0.12] px-4 py-2 text-xs uppercase tracking-wider hover:bg-white/5"
          >
            {t("notFound.landing")}
          </Link>
          <Link
            to="/playground"
            className="border border-[#5de6ff]/30 bg-[#5de6ff]/10 px-4 py-2 text-xs uppercase tracking-wider text-[#5de6ff]"
          >
            {t("notFound.playground")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
