import { Link } from "react-router-dom";
import { useBackendHealth } from "@/hooks/use-backend-health";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function BackendStatusBanner({ className }: Props) {
  const { status, recheck } = useBackendHealth();

  if (status === "checking" || status === "online") return null;

  return (
    <div
      role="status"
      className={cn(
        "border-b border-amber-900/40 bg-amber-950/30 px-4 py-2 font-mono text-[11px] text-amber-200/90",
        className
      )}
    >
      <span className="uppercase tracking-wider">Backend offline</span>
      <span className="mx-2 text-amber-200/50">·</span>
      <span>
        Start API on port 8001:{" "}
        <code className="text-amber-100/80">cd backend && python -m uvicorn main:app --port 8001</code>
      </span>
      <span className="mx-2 text-amber-200/50">·</span>
      <button
        type="button"
        onClick={() => void recheck()}
        className="underline hover:text-amber-100"
      >
        Retry
      </button>
      <span className="mx-2 text-amber-200/50">·</span>
      <Link to="/settings" className="underline hover:text-amber-100">
        Settings
      </Link>
    </div>
  );
}
