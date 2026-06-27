import { Database, Download, Shield, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { SettingsPanel } from "./SettingsLayout";
import type { SettingsHandlersProps } from "./settings-props";

export function SettingsStorageSection(props: SettingsHandlersProps) {
  const {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showExportDialog,
    setShowExportDialog,
    showImportDialog,
    setShowImportDialog,
    showSaveDialog,
    setShowSaveDialog,
    showLoadDialog,
    setShowLoadDialog,
    handleExport,
    handleImport,
    handleSaveToIndexedDB,
    handleLoadFromIndexedDB,
  } = props;

  return (
    <div className="space-y-3">
      <SettingsPanel title="Export / import" description="Encrypted key bundles" icon={Download}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 border border-stroke-subtle p-3">
            <p className="font-mono text-[10px] text-text-muted">Export encrypted JSON for backup or transfer.</p>
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="font-mono text-[11px]">
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Export keys
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export API Keys</DialogTitle>
                  <DialogDescription>Enter a password to encrypt your API keys before export.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="export-password">Password</Label>
                    <Input
                      id="export-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter encryption password"
                    />
                  </div>
                  <Button onClick={handleExport} disabled={!password}>
                    Export Keys
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2 border border-stroke-subtle p-3">
            <p className="font-mono text-[10px] text-text-muted">Import from encrypted file.</p>
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="font-mono text-[11px]">
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  Import keys
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import API Keys</DialogTitle>
                  <DialogDescription>Select an encrypted key file and enter the password.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="import-file">Encrypted Key File</Label>
                    <Input
                      id="import-file"
                      type="file"
                      accept=".json.enc,.json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImport(file);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="import-password">Password</Label>
                    <Input
                      id="import-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter decryption password"
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel title="Device vault" description="IndexedDB · AES-GCM" icon={Database}>
        <div className="flex flex-wrap gap-2">
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="font-mono text-[11px]">
                <Database className="mr-2 h-3.5 w-3.5" />
                Save to device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save to Device</DialogTitle>
                <DialogDescription>Save your API keys encrypted on this device.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="save-password">Password</Label>
                  <Input
                    id="save-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="save-confirm">Confirm Password</Label>
                  <Input
                    id="save-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handleSaveToIndexedDB} disabled={!password || !confirmPassword}>
                  Save to Device
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="font-mono text-[11px]">
                <Database className="mr-2 h-3.5 w-3.5" />
                Load from device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Load from Device</DialogTitle>
                <DialogDescription>Load your saved API keys from this device.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="load-password">Password</Label>
                  <Input
                    id="load-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handleLoadFromIndexedDB} disabled={!password}>
                  Load from Device
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SettingsPanel>

      <SettingsPanel title="Local storage state" description="Runtime persistence" icon={Shield}>
        <ul className="space-y-2 font-mono text-[11px] text-text-secondary">
          <li>· Default: in-memory only (cleared on tab close)</li>
          <li>· Device vault: optional AES-GCM via WebCrypto</li>
          <li>· Export format: encrypted JSON bundle</li>
          <li>· IndexedDB primary store for sessions & prompts</li>
          <li>· Optional cloud sync via Supabase (never stores API keys)</li>
        </ul>
        <Alert className="mt-3 border-stroke-subtle">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-mono text-[10px]">
            Browser reset clears in-memory keys unless exported or saved to device vault.
          </AlertDescription>
        </Alert>
      </SettingsPanel>
    </div>
  );
}

export function SettingsSecuritySection() {
  return (
    <SettingsPanel title="Security & privacy" description="BYOK isolation" icon={Shield}>
      <ul className="space-y-2 font-mono text-[11px] text-text-secondary">
        <li>
          <strong className="text-text-primary">In-memory default:</strong> keys cleared when the browser session ends.
        </li>
        <li>
          <strong className="text-text-primary">Encrypted persistence:</strong> optional AES-GCM + PBKDF2 for device/export.
        </li>
        <li>
          <strong className="text-text-primary">Direct routing:</strong> requests go from your browser to providers; compare API receives keys as headers only.
        </li>
        <li>
          <strong className="text-text-primary">No key sync:</strong> provider API keys are never uploaded to cloud storage.
        </li>
        <li>
          <strong className="text-text-primary">Local-first:</strong> comparison history lives in IndexedDB; cloud sync is optional.
        </li>
        <li>
          <strong className="text-text-primary">Self-hosted:</strong> run on your own infrastructure for full control.
        </li>
        <li>
          <strong className="text-text-primary">Provider isolation:</strong> each provider key is used only for its routed models.
        </li>
      </ul>
    </SettingsPanel>
  );
}
