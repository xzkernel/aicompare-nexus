import { useEffect, useState } from "react";
import { Cloud, Github, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "./SettingsLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCloudSync } from "@/hooks/use-cloud-sync";
import { patchPreferencesRecord } from "@/lib/idb/preferences-store";
import { listComparisonSessions } from "@/lib/session-store";
import { clearCloudData, uploadAllLocalSessions } from "@/lib/sync-engine";
import { useToast } from "@/hooks/use-toast";
import { isSupabaseConfigured } from "@/lib/supabase";

export function SettingsCloudSyncSection() {
  const { user, configured, signInWithGitHub, signInWithGoogle, signOut } = useAuth();
  const { status, syncEnabled, lastSyncAt, error, syncNow, isCloudActive } = useCloudSync();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const toggleSync = async (enabled: boolean) => {
    await patchPreferencesRecord({ syncEnabled: enabled });
  };

  const handleUploadLocal = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const count = await uploadAllLocalSessions(user.id);
      await syncNow();
      toast({
        title: "Local history uploaded",
        description: `${count} session(s) queued for cloud backup.`,
      });
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Could not upload sessions",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClearCloud = async () => {
    if (!user) return;
    if (!window.confirm("Delete all cloud-backed sessions and prompts for this account?")) return;
    try {
      await clearCloudData(user.id);
      toast({ title: "Cloud data cleared" });
    } catch (e) {
      toast({
        title: "Clear failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    }
  };

  if (!configured) {
    return null;
  }

  return (
    <div className="space-y-3">
      <SettingsPanel
        title="Cloud sync"
        description="Optional identity + backup"
        icon={Cloud}
        status={{
          label: isCloudActive ? status.toUpperCase() : user ? "SIGNED IN" : "LOCAL",
          ok: isCloudActive && status !== "error",
        }}
      >
        <p className="mb-3 font-mono text-[10px] text-text-muted leading-relaxed">
          Provider API keys remain local-only and are never synced. Compare and streaming work without
          signing in.
        </p>

        {!user ? (
          <div className="space-y-3">
            <p className="font-mono text-[10px] text-text-muted">
              Sign in to sync sessions across devices. You can continue using ModelWise locally without
              an account.
            </p>
            <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-[11px]"
              onClick={() => void signInWithGitHub()}
            >
              <Github className="mr-2 h-3.5 w-3.5" />
              GitHub
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-[11px]"
              onClick={() => void signInWithGoogle()}
            >
              <Cloud className="mr-2 h-3.5 w-3.5" />
              Google
            </Button>
          </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-mono text-[11px] text-text-secondary">
              <input
                type="checkbox"
                checked={syncEnabled}
                onChange={(e) => void toggleSync(e.target.checked)}
                className="rounded border-stroke-subtle"
              />
              Enable background sync
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-[11px]"
                onClick={() => void syncNow()}
                disabled={!syncEnabled || status === "syncing"}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Sync now
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-[11px]"
                onClick={() => void handleUploadLocal()}
                disabled={uploading}
              >
                Upload local history
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-[11px] text-text-muted"
                onClick={() => void signOut()}
              >
                Disconnect
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-[11px] text-destructive"
                onClick={() => void handleClearCloud()}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Clear cloud data
              </Button>
            </div>

            <UploadLocalPrompt onUpload={handleUploadLocal} />

            {lastSyncAt && (
              <p className="font-mono text-[10px] text-text-muted">
                Last sync: {new Date(lastSyncAt).toLocaleString()}
              </p>
            )}
            {error && <p className="font-mono text-[10px] text-amber-600/90">{error}</p>}
          </div>
        )}
      </SettingsPanel>
    </div>
  );
}

function UploadLocalPrompt({ onUpload }: { onUpload: () => void }) {
  const [count, setCount] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void listComparisonSessions().then((s) => setCount(s.length));
  }, []);

  if (dismissed || count == null || count === 0) return null;

  return (
    <div className="border border-stroke-subtle bg-bg-soft/40 p-2.5 font-mono text-[10px] text-text-secondary">
      Sync {count} local session{count === 1 ? "" : "s"} to cloud?
      <div className="mt-2 flex gap-2">
        <button type="button" className="underline text-accent-cyan" onClick={onUpload}>
          Upload now
        </button>
        <button type="button" className="text-text-muted" onClick={() => setDismissed(true)}>
          Not now
        </button>
      </div>
    </div>
  );
}
