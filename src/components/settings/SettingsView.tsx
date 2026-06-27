import { SettingsLayout } from "./SettingsLayout";
import { SettingsProfilesSection } from "./SettingsProfilesSection";
import { SettingsProvidersOverview } from "./SettingsProvidersOverview";
import { SettingsApiKeysSection } from "./SettingsApiKeysSection";
import { SettingsStorageSection, SettingsSecuritySection } from "./SettingsStorageSection";
import { SettingsCloudSyncSection } from "./SettingsCloudSyncSection";
import { CostEstimator } from "@/components/CostEstimator";
import { SessionExportImport } from "@/components/SessionExportImport";
import type { SettingsHandlersProps } from "./settings-props";
import type { ProviderId } from "@/config/providers";

export function SettingsView(props: SettingsHandlersProps) {
  const {
    activeSection,
    setActiveSection,
    hasValidKeys,
    apiKeys,
    openaiValid,
    googleValid,
    anthropicValid,
    metaValid,
    customValid,
  } = props;

  const connectedCount = [openaiValid, googleValid, anthropicValid, metaValid, customValid].filter(Boolean).length;
  const validity: Record<ProviderId, boolean> = {
    openai: openaiValid,
    google: googleValid,
    anthropic: anthropicValid,
    meta: metaValid,
    custom: customValid,
  };

  return (
    <SettingsLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      hasValidKeys={hasValidKeys}
      connectedCount={connectedCount}
    >
      {activeSection === "profiles" && (
        <SettingsProfilesSection
          profileId={props.profileId}
          setProfileId={props.setProfileId}
          availableProfiles={props.availableProfiles}
        />
      )}

      {activeSection === "providers" && (
        <SettingsProvidersOverview apiKeys={apiKeys} validity={validity} />
      )}

      {activeSection === "api-keys" && <SettingsApiKeysSection {...props} />}

      {activeSection === "storage" && <SettingsStorageSection {...props} />}

      {activeSection === "cloud" && <SettingsCloudSyncSection />}

      {activeSection === "sessions" && (
        <div className="border border-stroke-subtle [&_.rounded-lg]:rounded-none [&_.shadow]:shadow-none">
          <SessionExportImport />
        </div>
      )}

      {activeSection === "cost" && (
        <div className="border border-stroke-subtle [&_.rounded-lg]:rounded-none">
          <CostEstimator />
        </div>
      )}

      {activeSection === "security" && <SettingsSecuritySection />}
    </SettingsLayout>
  );
}
