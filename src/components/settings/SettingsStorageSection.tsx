import { Database, Download, Shield, Trash2, Upload } from "lucide-react";
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
import { isStrongVaultPassword, MIN_VAULT_PASSWORD_LENGTH } from "@/lib/secure-api-keys";
import { useTranslation } from "react-i18next";

export function SettingsStorageSection(props: SettingsHandlersProps) {
  const { t } = useTranslation();
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
    handleDeleteFromIndexedDB,
  } = props;
  const resetPasswords = () => {
    setPassword("");
    setConfirmPassword("");
  };
  const setDialog = (setter: (open: boolean) => void) => (open: boolean) => {
    resetPasswords();
    setter(open);
  };
  const strongPassword = isStrongVaultPassword(password);

  return (
    <div className="space-y-3">
      <SettingsPanel title="Export / import" description="Encrypted key bundles" icon={Download}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 border border-stroke-subtle p-3">
            <p className="font-mono text-[10px] text-text-muted">Export encrypted JSON for backup or transfer.</p>
            <Dialog open={showExportDialog} onOpenChange={setDialog(setShowExportDialog)}>
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
                      dir="ltr"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter encryption password"
                    />
                  </div>
                  <p className="text-xs text-text-muted">{t("settings.vault.passwordMinimum", { count: MIN_VAULT_PASSWORD_LENGTH })}</p>
                  <Button onClick={handleExport} disabled={!strongPassword}>
                    Export Keys
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2 border border-stroke-subtle p-3">
            <p className="font-mono text-[10px] text-text-muted">Import from encrypted file.</p>
            <Dialog open={showImportDialog} onOpenChange={setDialog(setShowImportDialog)}>
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
                    <Label htmlFor="import-password">Password</Label>
                    <Input
                      id="import-password"
                      type="password"
                      dir="ltr"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter decryption password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="import-file">Encrypted Key File</Label>
                    <Input
                      id="import-file"
                      type="file"
                      accept=".json.enc,.json"
                      disabled={!password}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImport(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel title="Encrypted device vault" description="Explicit persistence · IndexedDB · AES-GCM" icon={Database}>
        <div className="space-y-3">
          <p className="font-mono text-[10px] text-text-muted">
            Separate from active in-memory keys. Saving replaces the encrypted vault for this device.
          </p>
          <div className="flex flex-wrap gap-2">
            <Dialog open={showSaveDialog} onOpenChange={setDialog(setShowSaveDialog)}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="font-mono text-[11px]">
                <Database className="mr-2 h-3.5 w-3.5" />
                Save encrypted vault
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Encrypted Vault</DialogTitle>
                <DialogDescription>Save your API keys encrypted on this device.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="save-password">Password</Label>
                  <Input
                    id="save-password"
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="save-confirm">Confirm Password</Label>
                  <Input
                    id="save-confirm"
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <p className="text-xs text-text-muted">{t("settings.vault.passwordMinimum", { count: MIN_VAULT_PASSWORD_LENGTH })}</p>
                <Button onClick={handleSaveToIndexedDB} disabled={!strongPassword || !confirmPassword}>
                  Save Encrypted Vault
                </Button>
              </div>
            </DialogContent>
            </Dialog>

            <Dialog open={showLoadDialog} onOpenChange={setDialog(setShowLoadDialog)}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="font-mono text-[11px]">
                <Database className="mr-2 h-3.5 w-3.5" />
                Load encrypted vault
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Load Encrypted Vault</DialogTitle>
                <DialogDescription>Load your saved API keys from this device.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="load-password">Password</Label>
                  <Input
                    id="load-password"
                    type="password"
                    dir="ltr"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handleLoadFromIndexedDB} disabled={!password}>
                  Load Encrypted Vault
                </Button>
              </div>
            </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-[11px] text-destructive"
              onClick={() => void handleDeleteFromIndexedDB()}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete encrypted vault
            </Button>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel title="Local storage state" description="Runtime persistence" icon={Shield}>
        <ul className="space-y-2 font-mono text-[11px] text-text-secondary">
          <li>· Default: in-memory only (cleared on tab close)</li>
          <li>· Device vault: optional AES-GCM via WebCrypto</li>
          <li>· Export format: encrypted JSON bundle</li>
          <li>· {t("settings.storage.autoSave")}</li>
          <li>· Sessions and preferences remain on this device</li>
        </ul>
        <Alert className="mt-3 border-stroke-subtle">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-mono text-[10px]">
            Closing or reloading the tab clears active keys. An encrypted export or device vault must be loaded explicitly.
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
          <strong className="text-text-primary">Backend transit:</strong> prompts and selected provider keys pass through your configured ModelWise backend; it does not intentionally persist keys.
        </li>
        <li>
          <strong className="text-text-primary">Device-only data:</strong> sessions, preferences, and provider keys are never cloud-synced.
        </li>
        <li>
          <strong className="text-text-primary">Local-only:</strong> comparison history uses this browser's IndexedDB.
        </li>
        <li>
          <strong className="text-text-primary">Self-hosted:</strong> you control the ModelWise deployment; external providers still receive routed prompts and requests.
        </li>
        <li>
          <strong className="text-text-primary">Provider isolation:</strong> each provider key is used only for its routed models.
        </li>
      </ul>
    </SettingsPanel>
  );
}
