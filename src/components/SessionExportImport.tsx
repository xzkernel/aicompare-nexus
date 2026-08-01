import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, FileText, Database, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useComparisonSessions } from "@/hooks/use-comparison-sessions";
import {
  importComparisonSessions,
  listComparisonSessions,
  type ComparisonSession,
} from "@/lib/session-store";
import {
  encodeCsvCell,
  MAX_IMPORT_FILE_BYTES,
  parseSessionImport,
} from "@/lib/session-import";
import { useLocale } from "@/contexts/LocaleProvider";

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
  const { t } = useTranslation();
  const { locale } = useLocale();
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
        name: `ModelWise Sessions - ${new Date().toLocaleDateString(locale)}`,
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
          "Left Tokens",
          "Right Tokens",
          "Pinned",
          "Verdict",
        ].join(",");

        const csvRows = sessions.map((s) =>
          [
            encodeCsvCell(s.id, true),
            encodeCsvCell(new Date(s.timestamp).toISOString()),
            encodeCsvCell(s.prompt, true),
            encodeCsvCell(s.leftModel, true),
            encodeCsvCell(s.rightModel, true),
            encodeCsvCell(s.leftResponse, true),
            encodeCsvCell(s.rightResponse, true),
            encodeCsvCell(s.leftTimeMs),
            encodeCsvCell(s.rightTimeMs),
            encodeCsvCell(s.leftTokens),
            encodeCsvCell(s.rightTokens),
            encodeCsvCell(s.pinned ? "yes" : "no"),
            encodeCsvCell(s.verdict),
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
      if (file.size > MAX_IMPORT_FILE_BYTES) {
        throw new Error("file-too-large");
      }

      const text = await file.text();
      const imported = parseSessionImport(text, file.name);
      if (!imported.length) throw new Error("no-valid-sessions");

      const result = await importComparisonSessions(imported);

      toast({
        title: t("sessions.importSuccess"),
        description: t("sessions.importResult", result),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      const description = reason === "file-too-large"
        ? t("sessions.fileTooLarge")
        : reason === "no-valid-sessions"
          ? t("sessions.noValidSessions")
          : reason.includes("limited")
            ? t("sessions.rowLimit", { count: 1_000 })
            : t("sessions.importFailedDescription");
      toast({
        title: t("sessions.importFailed"),
        description,
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
                 if (file) void importSessions(file);
                 e.currentTarget.value = "";
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
