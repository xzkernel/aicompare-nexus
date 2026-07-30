import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSecureApiKeys } from "@/lib/secure-api-keys";
import { SettingsView } from "@/components/settings/SettingsView";
import { SETTINGS_SECTION_IDS, type SettingsSectionId } from "@/components/settings/settings-sections";

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('api-keys');
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({
    openaiKey: false,
    googleKey: false,
    anthropicKey: false,
    opencodeKey: false,
    metaRelayKey: false,
    customApiKey: false
  });
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();
  
  const {
    apiKeys,
    setApiKeys,
    clearApiKeys,
    getApiKeyStatus,
    exportKeys,
    importKeys,
    saveKeysToIndexedDB,
    loadKeysFromIndexedDB,
    deleteKeysFromIndexedDB,
    redactKeys,
  } = useSecureApiKeys();

  useEffect(() => {
    const section = searchParams.get("section");
    const nextSection = section && SETTINGS_SECTION_IDS.includes(section as SettingsSectionId)
      ? section as SettingsSectionId
      : "api-keys";

    setActiveSection(nextSection);
    if (section !== nextSection) {
      setSearchParams({ section: nextSection }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Handle API key input change
  const handleKeyChange = (keyName: string, value: string) => {
    setApiKeys({
      ...apiKeys,
      [keyName]: value
    });
  };

  // Handle meta relay provider change
  const handleMetaRelayChange = (provider: 'openrouter' | 'together') => {
    setApiKeys({
      ...apiKeys,
      metaRelayProvider: provider
    });
  };

  // Handle custom API config change
  const handleCustomConfigChange = (field: 'baseUrl' | 'keyHeader', value: string) => {
    setApiKeys({
      ...apiKeys,
      customApiConfig: {
        ...apiKeys.customApiConfig!,
        [field]: value
      }
    });
  };

  // Clear only the active in-memory values. The encrypted vault is separate.
  const handleClear = () => {
    clearApiKeys();
    toast({
      title: "Active Keys Cleared",
      description: "Active keys were removed from memory. Any encrypted device vault remains.",
    });
  };

  // Toggle key visibility
  const toggleKeyVisibility = (keyName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyName]: !prev[keyName]
    }));
  };

  const handleSectionChange = (section: SettingsSectionId) => {
    setActiveSection(section);
    setSearchParams({ section });
  };

  // Handle export
  const handleExport = async () => {
    if (!password) {
      toast({
        title: "Password Required",
        description: "Please enter a password to encrypt your keys.",
        variant: "destructive",
      });
      return;
    }

    try {
      await exportKeys(password);
      setShowExportDialog(false);
      setPassword('');
      toast({
        title: "Keys Exported",
        description: "Your API keys have been exported as an encrypted file.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: redactKeys(`Failed to export keys: ${error}`),
        variant: "destructive",
      });
    }
  };

  // Handle import
  const handleImport = async (file: File) => {
    if (!password) {
      toast({
        title: "Password Required",
        description: "Please enter the password to decrypt your keys.",
        variant: "destructive",
      });
      return;
    }

    try {
      await importKeys(file, password);
      setShowImportDialog(false);
      setPassword('');
      toast({
        title: "Keys Imported",
        description: "Your API keys have been imported successfully.",
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: redactKeys(`Failed to import keys: ${error}`),
        variant: "destructive",
      });
    }
  };

  // Handle save to IndexedDB
  const handleSaveToIndexedDB = async () => {
    if (!password) {
      toast({
        title: "Password Required",
        description: "Please enter a password to encrypt your keys.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveKeysToIndexedDB(password);
      setShowSaveDialog(false);
      setPassword('');
      setConfirmPassword('');
      toast({
        title: "Keys Saved",
        description: "Your API keys have been saved securely to your device.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: redactKeys(`Failed to save keys: ${error}`),
        variant: "destructive",
      });
    }
  };

  // Handle load from IndexedDB
  const handleLoadFromIndexedDB = async () => {
    if (!password) {
      toast({
        title: "Password Required",
        description: "Please enter the password to decrypt your keys.",
        variant: "destructive",
      });
      return;
    }

    try {
      await loadKeysFromIndexedDB(password);
      setShowLoadDialog(false);
      setPassword('');
      toast({
        title: "Keys Loaded",
        description: "Your API keys have been loaded from your device.",
      });
    } catch (error) {
      toast({
        title: "Load Failed",
        description: redactKeys(`Failed to load keys: ${error}`),
        variant: "destructive",
      });
    }
  };

  const handleDeleteFromIndexedDB = async () => {
    if (!window.confirm("Delete the encrypted API key vault for this device? Active in-memory keys will remain.")) {
      return;
    }

    try {
      await deleteKeysFromIndexedDB();
      toast({
        title: "Encrypted Vault Deleted",
        description: "The encrypted device copy was deleted. Active in-memory keys remain until cleared or the tab closes.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: redactKeys(`Failed to delete encrypted vault: ${error}`),
        variant: "destructive",
      });
    }
  };

  const { hasValidKeys, openaiValid, googleValid, anthropicValid, opencodeValid, metaValid, customValid } = getApiKeyStatus();

  return (
    <SettingsView
      apiKeys={apiKeys}
      setApiKeys={setApiKeys}
      showKeys={showKeys}
      toggleKeyVisibility={toggleKeyVisibility}
      handleKeyChange={handleKeyChange}
      handleMetaRelayChange={handleMetaRelayChange}
      handleCustomConfigChange={handleCustomConfigChange}
      handleClear={handleClear}
      hasValidKeys={hasValidKeys}
      openaiValid={openaiValid}
      googleValid={googleValid}
      anthropicValid={anthropicValid}
      opencodeValid={opencodeValid}
      metaValid={metaValid}
      customValid={customValid}
      password={password}
      setPassword={setPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      showExportDialog={showExportDialog}
      setShowExportDialog={setShowExportDialog}
      showImportDialog={showImportDialog}
      setShowImportDialog={setShowImportDialog}
      showSaveDialog={showSaveDialog}
      setShowSaveDialog={setShowSaveDialog}
      showLoadDialog={showLoadDialog}
      setShowLoadDialog={setShowLoadDialog}
      handleExport={handleExport}
      handleImport={handleImport}
      handleSaveToIndexedDB={handleSaveToIndexedDB}
      handleLoadFromIndexedDB={handleLoadFromIndexedDB}
      handleDeleteFromIndexedDB={handleDeleteFromIndexedDB}
      activeSection={activeSection}
      setActiveSection={handleSectionChange}
    />
  );
}
