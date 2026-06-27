import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, FileText, Database, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useComparisonSessions } from "@/hooks/use-comparison-sessions";
import {
  importComparisonSessions,
  listComparisonSessions,
  type ComparisonSession,
} from "@/lib/session-store";

interface DatasetExport {
  id: string;
  name: string;
  description: string;
  timestamp: number;
  sessions: ComparisonSession[];
}

export function SessionExportImport() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const { stats, sessions } = useComparisonSessions();

  const exportSessions = async (format: "json" | "csv") => {
    setIsExporting(true);
    const sessions = await listComparisonSessions();

    if (!sessions.length) {
      toast({
        title: "Nothing to export",
        description: "Run comparisons in the workbench first.",
        variant: "destructive",
      });
      setIsExporting(false);
      return;
    }

    try {
      const dataset: DatasetExport = {
        id: `dataset-${Date.now()}`,
        name: `ModelWise Sessions - ${new Date().toLocaleDateString()}`,
        description: "Exported comparison sessions from ModelWise",
        timestamp: Date.now(),
        sessions,
      };

      if (format === "json") {
        const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `modelwise-sessions-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const csvHeaders = [
          "Session ID",
          "Timestamp",
          "Prompt",
          "Left Model",
          "Right Model",
          "Left Response",
          "Right Response",
          "Left Time (ms)",
          "Right Time (ms)",
          "Pinned",
        ].join(",");

        const csvRows = sessions.map((s) =>
          [
            s.id,
            new Date(s.timestamp).toISOString(),
            `"${s.prompt.replace(/"/g, '""')}"`,
            s.leftModel,
            s.rightModel,
            `"${(s.leftResponse || "").replace(/"/g, '""')}"`,
            `"${(s.rightResponse || "").replace(/"/g, '""')}"`,
            s.leftTimeMs ?? "",
            s.rightTimeMs ?? "",
            s.pinned ? "yes" : "no",
          ].join(",")
        );

        const blob = new Blob([[csvHeaders, ...csvRows].join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `modelwise-sessions-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Export Successful",
        description: `Exported ${sessions.length} session(s) as ${format.toUpperCase()}.`,
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "Failed to export sessions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const importSessions = async (file: File) => {
    setIsImporting(true);

    try {
      // Size guard — reject files over 10 MB before parsing
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Import file is too large (max 10 MB)");
      }

      const text = await file.text();
      let imported: ComparisonSession[] = [];

      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(text) as DatasetExport | { sessions: ComparisonSession[] };
        const rawSessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
        // Structural validation — only accept recognised fields, coerce types
        imported = rawSessions
          .filter((s): s is Record<string, unknown> => s !== null && typeof s === "object")
          .map((s) => ({
            id: typeof s.id === "string" && s.id.length < 128 ? s.id : crypto.randomUUID(),
            timestamp: typeof s.timestamp === "number" && Number.isFinite(s.timestamp) ? s.timestamp : Date.now(),
            prompt: typeof s.prompt === "string" ? s.prompt.slice(0, 32_000) : "",
            leftModel: typeof s.leftModel === "string" ? s.leftModel.slice(0, 128) : "",
            rightModel: typeof s.rightModel === "string" ? s.rightModel.slice(0, 128) : "",
            leftResponse: typeof s.leftResponse === "string" ? s.leftResponse : undefined,
            rightResponse: typeof s.rightResponse === "string" ? s.rightResponse : undefined,
            leftTimeMs: typeof s.leftTimeMs === "number" ? s.leftTimeMs : undefined,
            rightTimeMs: typeof s.rightTimeMs === "number" ? s.rightTimeMs : undefined,
            pinned: s.pinned === true,
          }))
          .filter((s) => s.prompt.length > 0 && s.leftModel.length > 0);
      } else if (file.name.endsWith(".csv")) {
        const lines = text.split("\n").filter((l) => l.trim());
        // Skip header row; limit to 10 000 rows to prevent DoS
        for (let i = 1; i < Math.min(lines.length, 10_001); i++) {
          const values = lines[i].split(",");
          const unquote = (v: string | undefined) =>
            (v ?? "").replace(/^"|"$/g, "").replace(/""/g, '"');
          const prompt = unquote(values[2]).slice(0, 32_000);
          const leftModel = (values[3] ?? "").slice(0, 128);
          if (!prompt || !leftModel) continue;
          const ts = new Date(values[1]).getTime();
          imported.push({
            id: values[0]?.length < 128 ? (values[0] || crypto.randomUUID()) : crypto.randomUUID(),
            timestamp: Number.isFinite(ts) ? ts : Date.now(),
            prompt,
            leftModel,
            rightModel: (values[4] ?? "").slice(0, 128),
            leftResponse: unquote(values[5]) || undefined,
            rightResponse: unquote(values[6]) || undefined,
            leftTimeMs: values[7] ? parseInt(values[7], 10) : undefined,
            rightTimeMs: values[8] ? parseInt(values[8], 10) : undefined,
            pinned: values[9] === "yes",
          });
        }
      } else {
        throw new Error("Unsupported file format");
      }

      await importComparisonSessions(imported);

      toast({
        title: "Import Successful",
        description: `Imported ${imported.length} session(s) into local storage.`,
      });
    } catch {
      toast({
        title: "Import Failed",
        description: "Failed to import sessions. Check file format.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const totalTimeSec =
    sessions.reduce((sum, s) => sum + (s.leftTimeMs ?? 0) + (s.rightTimeMs ?? 0), 0) / 1000;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Session Export/Import
        </CardTitle>
        <CardDescription>
          Export your comparison sessions for backup or import them from other sources.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Local storage:</strong> Sessions persist in IndexedDB on this device. Export regularly for backup.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Export Sessions</h4>
          <div className="flex gap-3">
            <Button onClick={() => exportSessions("json")} disabled={isExporting} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export as JSON
            </Button>
            <Button
              onClick={() => exportSessions("csv")}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export as CSV
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Import Sessions</h4>
          <div className="space-y-2">
            <Label htmlFor="import-file">Select File</Label>
            <Input
              id="import-file"
              type="file"
              accept=".json,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importSessions(file);
              }}
              disabled={isImporting}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Session Statistics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Sessions</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-2xl font-bold">{totalTimeSec.toFixed(1)}s</div>
              <div className="text-sm text-muted-foreground">Cumulative latency</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
