import { cn } from "@/lib/utils";
import type { CapabilityBadge } from "@/lib/model-registry/helpers";

const BADGE_CLASS =
  "font-mono text-[9px] uppercase tracking-wider text-text-muted border border-stroke-subtle px-1 py-px leading-none";

type Props = {
  badges: CapabilityBadge[];
  className?: string;
  max?: number;
};

export function ModelCapabilityBadges({ badges, className, max = 4 }: Props) {
  if (!badges.length) return null;
  const shown = badges.slice(0, max);
  return (
    <span className={cn("inline-flex flex-wrap gap-0.5 ml-1.5", className)}>
      {shown.map((b) => (
        <span key={b} className={BADGE_CLASS}>
          {b}
        </span>
      ))}
    </span>
  );
}
