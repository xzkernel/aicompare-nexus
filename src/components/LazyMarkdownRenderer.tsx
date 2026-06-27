import { lazy, Suspense } from "react";
import type { ComponentProps } from "react";

const MarkdownRenderer = lazy(() =>
  import("@/components/MarkdownRenderer").then((m) => ({ default: m.MarkdownRenderer }))
);

type Props = ComponentProps<typeof MarkdownRenderer>;

export function LazyMarkdownRenderer(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="font-mono text-[11px] text-text-muted animate-pulse">Loading markdown…</div>
      }
    >
      <MarkdownRenderer {...props} />
    </Suspense>
  );
}
