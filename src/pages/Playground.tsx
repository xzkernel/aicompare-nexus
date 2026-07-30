import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PromptPlayground } from "@/components/comparison/PromptPlayground";
import { ComparisonSessionList } from "@/components/sessions/ComparisonSessionList";
import { getComparisonSession, type ComparisonSession } from "@/lib/session-store";

export default function Playground() {
  const [params, setParams] = useSearchParams();
  const sessionId = params.get("session");
  const [restoredSession, setRestoredSession] = useState<ComparisonSession | null>(null);

  useEffect(() => {
    let active = true;
    if (!sessionId) {
      setRestoredSession(null);
      return () => {
        active = false;
      };
    }
    void getComparisonSession(sessionId).then((session) => {
      if (active) setRestoredSession(session ?? null);
    });
    return () => {
      active = false;
    };
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-workspace space-y-4">
      <PromptPlayground
        restoredSession={restoredSession}
        onSessionSaved={(id) => setParams({ session: id }, { replace: true })}
      />
      <section className="border border-stroke-subtle bg-bg-paper/20 p-3">
        <ComparisonSessionList limit={8} />
      </section>
    </div>
  );
}
