import { SettingsLayout } from "./SettingsLayout";
import { SettingsProvidersOverview } from "./SettingsProvidersOverview";
import { SettingsApiKeysSection } from "./SettingsApiKeysSection";
import { SettingsStorageSection, SettingsSecuritySection } from "./SettingsStorageSection";
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
    opencodeValid,
    metaValid,
    customValid,
  } = props;

  const routesConfiguredCount = [
    openaiValid,
    googleValid,
    anthropicValid,
    opencodeValid,
    opencodeValid,
    metaValid,
    customValid,
  ].filter(Boolean).length;
  const validity: Record<ProviderId, boolean> = {
    openai: openaiValid,
    google: googleValid,
    anthropic: anthropicValid,
    "opencode-go": opencodeValid,
    "opencode-zen": opencodeValid,
    meta: metaValid,
    custom: customValid,
  };

  return (
    <SettingsLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      hasValidKeys={hasValidKeys}
      routesConfiguredCount={routesConfiguredCount}
    >
      {activeSection === "providers" && (
        <SettingsProvidersOverview apiKeys={apiKeys} validity={validity} />
      )}

      {activeSection === "api-keys" && <SettingsApiKeysSection {...props} />}

      {activeSection === "storage" && <SettingsStorageSection {...props} />}

      {activeSection === "sessions" && (
        <div className="border border-stroke-subtle [&_.rounded-lg]:rounded-none [&_.shadow]:shadow-none">
          <SessionExportImport />
        </div>
      )}

      {activeSection === "security" && <SettingsSecuritySection />}
    </SettingsLayout>
  );
}
