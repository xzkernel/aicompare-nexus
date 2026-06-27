import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSecureApiKeys } from "@/lib/secure-api-keys";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SettingsView } from "@/components/settings/SettingsView";
import type { SettingsSectionId } from "@/components/settings/SettingsLayout";

export default function Settings() {
  const [searchParams] = useSearchParams();
  const [profileId, setProfileId] = useState('default');
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('api-keys');
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({
    openaiKey: false,
    googleKey: false,
    anthropicKey: false,
    metaRelayKey: false,
    customApiKey: false
  });
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [availableProfiles, setAvailableProfiles] = useState<string[]>([]);
  const { toast } = useToast();
  
  const {
    apiKeys,
    setApiKeys,
    clearApiKeys,
    validateApiKey,
    getApiKeyStatus,
    getApiKey,
    exportKeys,
    importKeys,
    saveKeysToIndexedDB,
    loadKeysFromIndexedDB,
    deleteKeysFromIndexedDB,
    listProfiles,
    redactKeys,
    isLoading
  } = useSecureApiKeys(profileId);

  // Load available profiles on mount
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const profiles = await listProfiles();
        setAvailableProfiles(profiles);
      } catch (error) {
        console.error('Failed to load profiles:', error);
      }
    };
    loadProfiles();
  }, [listProfiles]);

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "cloud" && isSupabaseConfigured()) setActiveSection("cloud");
  }, [searchParams]);

  useEffect(() => {
    if (activeSection === "cloud" && !isSupabaseConfigured()) {
      setActiveSection("api-keys");
    }
  }, [activeSection]);

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

  // Handle save (in-memory only)
  const handleSave = async () => {
    try {
      const { hasValidKeys } = getApiKeyStatus();

      if (!hasValidKeys) {
        toast({
          title: "Invalid API Keys",
          description: "Please enter at least one valid API key.",
          variant: "destructive",
        });
        return;
      }

      setApiKeys(apiKeys);

      toast({
        title: "API Keys Saved",
        description: "Keys stored in this browser (localStorage). They reload on refresh.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: redactKeys(`Failed to save API keys: ${error}`),
        variant: "destructive",
      });
    }
  };

  // Handle clear keys
  const handleClear = () => {
    clearApiKeys();
    toast({
      title: "API Keys Cleared",
      description: "All API keys have been removed from memory.",
    });
  };

  // Toggle key visibility
  const toggleKeyVisibility = (keyName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyName]: !prev[keyName]
    }));
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

  const { hasValidKeys, openaiValid, googleValid, anthropicValid, metaValid, customValid } = getApiKeyStatus();

  return (
    <SettingsView
      profileId={profileId}
      setProfileId={setProfileId}
      availableProfiles={availableProfiles}
      apiKeys={apiKeys}
      setApiKeys={setApiKeys}
      showKeys={showKeys}
      toggleKeyVisibility={toggleKeyVisibility}
      handleKeyChange={handleKeyChange}
      handleMetaRelayChange={handleMetaRelayChange}
      handleCustomConfigChange={handleCustomConfigChange}
      handleSave={handleSave}
      handleClear={handleClear}
      isLoading={isLoading}
      hasValidKeys={hasValidKeys}
      openaiValid={openaiValid}
      googleValid={googleValid}
      anthropicValid={anthropicValid}
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
      activeSection={activeSection}
      setActiveSection={setActiveSection}
    />
  );
}
