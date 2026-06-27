import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PromptPlayground } from "@/components/comparison/PromptPlayground";
import { ComparisonSessionList } from "@/components/sessions/ComparisonSessionList";
import { getComparisonSession, type ComparisonSession } from "@/lib/session-store";

export default function Playground() {
  const [params] = useSearchParams();
  const sessionId = params.get("session");
  const [restoredSession, setRestoredSession] = useState<ComparisonSession | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setRestoredSession(null);
      return;
    }
    void getComparisonSession(sessionId).then((s) => setRestoredSession(s ?? null));
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-workspace space-y-4">
      <PromptPlayground restoredSession={restoredSession} />
      <section className="border border-stroke-subtle bg-bg-paper/20 p-3">
        <ComparisonSessionList limit={8} />
      </section>
    </div>
  );
}
