import { Link } from "react-router-dom";
import { KeyRound, Play } from "lucide-react";

export function DashboardQuickActions() {
  return (
    <aside className="border border-stroke-subtle">
      <header className="border-b border-stroke-subtle px-3 py-2">
        <p className="mw-label-mono text-text-muted">Operations</p>
      </header>
      <div className="divide-y divide-stroke-subtle">
        <Link
          to="/playground"
          className="flex gap-3 px-3 py-3 transition-colors hover:bg-bg-paper/40"
        >
          <Play className="h-4 w-4 shrink-0 text-accent-cyan" strokeWidth={1.75} />
          <div>
            <p className="font-mono text-[11px] text-text-primary">Run comparison</p>
            <p className="font-mono text-[10px] text-text-muted">Open evaluation workbench</p>
          </div>
        </Link>
        <Link
          to="/settings"
          className="flex gap-3 px-3 py-3 transition-colors hover:bg-bg-paper/40"
        >
          <KeyRound className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.75} />
          <div>
            <p className="font-mono text-[11px] text-text-primary">Control center</p>
            <p className="font-mono text-[10px] text-text-muted">API keys · routing · vault</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
