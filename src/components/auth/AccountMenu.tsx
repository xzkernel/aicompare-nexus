import { Cloud, Github, LogOut, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useCloudSync } from "@/hooks/use-cloud-sync";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

function syncLabelKey(status: string): string {
  switch (status) {
    case "syncing":
      return "account.syncing";
    case "error":
      return "account.syncErr";
    case "offline":
      return "account.offline";
    case "idle":
      return "account.syncOk";
    default:
      return "account.local";
  }
}

export function AccountMenu({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { user, configured, signInWithGitHub, signInWithGoogle, signOut, loading } = useAuth();
  const { status, isCloudActive } = useCloudSync();

  if (!configured) {
    return (
      <span
        className={cn(
          "hidden font-mono text-[10px] uppercase tracking-wider text-white/40 lg:inline",
          className
        )}
      >
        {t("auth.localMode")}
      </span>
    );
  }

  if (loading) {
    return (
      <span className={cn("font-mono text-[10px] uppercase text-white/40", className)}>
        …
      </span>
    );
  }

  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "border border-white/[0.08] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/60 hover:text-white hover:border-white/20",
              className
            )}
          >
            {t("auth.signInToSync")}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="font-mono text-xs">
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground leading-relaxed">
            {t("auth.optionalSync")}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/auth">{t("auth.signInToSyncLink")}</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const email = user.email ?? "account";
  const short = email.split("@")[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 border border-white/[0.08] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/70 hover:text-white",
            className
          )}
        >
          <User className="h-3 w-3" />
          {short}
          <span
            className={cn(
              "text-[9px]",
              isCloudActive ? "text-[#5de6ff]" : "text-white/40"
            )}
          >
            {isCloudActive ? t(syncLabelKey(status)) : t("account.local")}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="font-mono text-xs">
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground">{email}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">Cloud sync settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LocalModeBadge() {
  const { isCloudActive } = useCloudSync();
  const { configured } = useAuth();

  return (
    <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-wider lg:flex">
      <span className="border border-white/[0.06] px-2 py-0.5 text-white/40">OFFLINE READY</span>
      {isCloudActive ? (
        <span className="border border-[#5de6ff]/20 bg-[#5de6ff]/5 px-2 py-0.5 text-[#5de6ff]">
          CLOUD SYNC
        </span>
      ) : (
        <span className="border border-white/[0.06] px-2 py-0.5 text-white/50">
          {configured ? "LOCAL MODE" : "LOCAL MODE"}
        </span>
      )}
    </div>
  );
}
