import { AlertCircle, CheckCircle, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsPanel, SettingsKeyField, RoutingToggle } from "./SettingsLayout";
import type { SettingsHandlersProps } from "./settings-props";
import { useTranslation } from "react-i18next";

export function SettingsApiKeysSection(props: SettingsHandlersProps) {
  const { t } = useTranslation();
  const {
    apiKeys,
    showKeys,
    toggleKeyVisibility,
    handleKeyChange,
    handleMetaRelayChange,
    handleCustomConfigChange,
    handleClear,
    hasValidKeys,
    openaiValid,
    googleValid,
    anthropicValid,
    opencodeValid,
    metaValid,
    customValid,
    setApiKeys,
  } = props;
  const openRouterRequired = apiKeys.googleProvider === "openrouter" || apiKeys.claudeProvider === "openrouter";
  const updateRoute = (
    field: "googleProvider" | "claudeProvider",
    value: "google" | "anthropic" | "openrouter"
  ) => {
    setApiKeys({
      ...apiKeys,
      [field]: value,
      ...(value === "openrouter" ? { metaRelayProvider: "openrouter" as const } : {}),
    });
  };

  return (
    <div className="space-y-3">
      {hasValidKeys ? (
        <Alert className="border-stroke-subtle bg-bg-soft/50">
          <CheckCircle className="h-4 w-4 text-accent-green" />
          <AlertDescription className="font-mono text-[11px]">
            {t("settings.api.routeConfigured")}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-mono text-[11px]">
            {t("settings.api.noRoutes")}
          </AlertDescription>
        </Alert>
      )}

      <SettingsPanel title="OpenAI" description="GPT family · routed through ModelWise backend" icon={Key} status={{ label: openaiValid ? "configured" : "missing", ok: openaiValid }}>
        <SettingsKeyField
          id="openai-key"
          label="API key"
          value={apiKeys.openaiKey}
          placeholder="sk-..."
          visible={showKeys.openaiKey}
          onToggleVisible={() => toggleKeyVisibility("openaiKey")}
          onChange={(v) => handleKeyChange("openaiKey", v)}
          valid={openaiValid}
          helpUrl="https://platform.openai.com/api-keys"
          hint='Prefix "sk-" · held in memory and sent through the configured backend per request'
        />
      </SettingsPanel>

      <SettingsPanel title="Google Gemini" description="Gemini models" icon={Key} status={{ label: googleValid ? "configured" : "missing", ok: googleValid }}>
        <div className="space-y-3">
          <SettingsKeyField
            id="google-key"
            label="API key"
            value={apiKeys.googleKey}
            placeholder="AIza..."
            visible={showKeys.googleKey}
            onToggleVisible={() => toggleKeyVisibility("googleKey")}
            onChange={(v) => handleKeyChange("googleKey", v)}
            valid={googleValid}
            helpUrl="https://makersuite.google.com/app/apikey"
          />
          <RoutingToggle
            label="Routing mode"
            value={apiKeys.googleProvider || "google"}
            onChange={(id) => updateRoute("googleProvider", id as "google" | "openrouter")}
            options={[
              { id: "google", label: "Direct" },
              { id: "openrouter", label: "OpenRouter" },
            ]}
          />
          {apiKeys.googleProvider === "openrouter" && (
            <p className="border border-stroke-subtle bg-bg-soft p-2 font-mono text-[10px] text-text-muted">
              {t("settings.api.googleOpenRouter")}
            </p>
          )}
        </div>
      </SettingsPanel>

      <SettingsPanel title="Anthropic Claude" description="Claude models" icon={Key} status={{ label: anthropicValid ? "configured" : "missing", ok: anthropicValid }}>
        <div className="space-y-3">
          <RoutingToggle
            label="Routing mode"
            value={apiKeys.claudeProvider || "anthropic"}
            onChange={(id) => updateRoute("claudeProvider", id as "anthropic" | "openrouter")}
            options={[
              { id: "anthropic", label: "Direct" },
              { id: "openrouter", label: "OpenRouter" },
            ]}
          />
          {(!apiKeys.claudeProvider || apiKeys.claudeProvider === "anthropic") && (
            <SettingsKeyField
              id="anthropic-key"
              label="API key"
              value={apiKeys.anthropicKey}
              placeholder="sk-ant-..."
              visible={showKeys.anthropicKey}
              onToggleVisible={() => toggleKeyVisibility("anthropicKey")}
              onChange={(v) => handleKeyChange("anthropicKey", v)}
              valid={anthropicValid}
              helpUrl="https://console.anthropic.com/"
            />
          )}
          {apiKeys.claudeProvider === "openrouter" && (
            <p className="font-mono text-[10px] text-text-muted border border-stroke-subtle bg-bg-soft p-2">
              {t("settings.api.claudeOpenRouter")}
            </p>
          )}
        </div>
      </SettingsPanel>

      <SettingsPanel title="OpenCode" description="Go subscription + Zen pay-as-you-go" icon={Key} status={{ label: opencodeValid ? "2 routes configured" : "missing", ok: opencodeValid }}>
        <div className="space-y-3">
          <p className="font-mono text-[10px] leading-relaxed text-text-muted">
            One OpenCode workspace API key enables both OpenCode Go subscription models and OpenCode Zen pay-as-you-go models.
          </p>
          <div className="flex gap-3 font-mono text-[10px]">
            <a className="text-accent-cyan hover:underline" href="https://opencode.ai/docs/go/" target="_blank" rel="noreferrer">
              Go docs
            </a>
            <a className="text-accent-cyan hover:underline" href="https://opencode.ai/docs/zen/" target="_blank" rel="noreferrer">
              Zen docs
            </a>
          </div>
          <SettingsKeyField
            id="opencode-key"
            label="Workspace API key"
            value={apiKeys.opencodeKey}
            placeholder="OpenCode workspace key"
            visible={showKeys.opencodeKey}
            onToggleVisible={() => toggleKeyVisibility("opencodeKey")}
            onChange={(v) => handleKeyChange("opencodeKey", v)}
            valid={opencodeValid}
            helpUrl="https://opencode.ai/auth"
            hint="Shared by Go and Zen · held in memory by default"
          />
        </div>
      </SettingsPanel>

      <SettingsPanel title="Meta / Relay" description="Llama & relayed models" icon={Key} status={{ label: metaValid ? "configured" : "missing", ok: metaValid }}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="mw-label-mono text-text-muted">Relay service</span>
            <Select
              value={openRouterRequired ? "openrouter" : apiKeys.metaRelayProvider}
              onValueChange={handleMetaRelayChange}
            >
              <SelectTrigger className="h-9 border-stroke-subtle bg-bg-soft font-mono text-[12px]">
                <SelectValue placeholder="Select relay" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="together" disabled={openRouterRequired}>Together AI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {openRouterRequired && (
            <p className="font-mono text-[10px] text-text-muted">{t("settings.api.openRouterRequired")}</p>
          )}
          <SettingsKeyField
            id="meta-key"
            label="Relay API key"
            value={apiKeys.metaRelayKey}
            placeholder="sk-..."
            visible={showKeys.metaRelayKey}
            onToggleVisible={() => toggleKeyVisibility("metaRelayKey")}
            onChange={(v) => handleKeyChange("metaRelayKey", v)}
            valid={metaValid}
            helpUrl={apiKeys.metaRelayProvider === "together" ? "https://api.together.ai/settings/api-keys" : "https://openrouter.ai/keys"}
          />
        </div>
      </SettingsPanel>

      <SettingsPanel title="Custom HTTP" description="OpenAI-compatible HTTPS endpoint" icon={Key} status={{ label: customValid ? "configured" : "missing", ok: customValid }}>
        <div className="space-y-3">
          <SettingsKeyField
            id="custom-base-url"
            label="Base URL"
            value={apiKeys.customApiConfig?.baseUrl || ""}
            placeholder="https://api.example.com"
            onChange={(v) => handleCustomConfigChange("baseUrl", v)}
            hideable={false}
          />
          <SettingsKeyField
            id="custom-key-header"
            label="Key header"
            value={apiKeys.customApiConfig?.keyHeader || "Authorization"}
            placeholder="Authorization"
            onChange={(v) => handleCustomConfigChange("keyHeader", v)}
            hideable={false}
          />
          <SettingsKeyField
            id="custom-key"
            label="API key"
            value={apiKeys.customApiKey}
            placeholder="your-api-key"
            visible={showKeys.customApiKey}
            onToggleVisible={() => toggleKeyVisibility("customApiKey")}
            onChange={(v) => handleKeyChange("customApiKey", v)}
            valid={customValid}
          />
        </div>
      </SettingsPanel>

      <Alert className="border-stroke-subtle bg-bg-soft/50">
        <AlertDescription className="font-mono text-[11px] text-text-muted">
          <strong className="text-text-primary">Web search (playground):</strong> Gemini grounding, Claude
          web_search, and OpenRouter online mode are supported. OpenAI direct keys do not enable live search
          in ModelWise — use OpenRouter relay for GPT with search if your model supports tools.
        </AlertDescription>
      </Alert>

      <div className="border border-stroke-subtle bg-bg-soft/30 p-3">
        <p className="mb-2 font-mono text-[10px] text-text-muted">
          Changes apply immediately in memory. Clearing active keys does not delete a separately saved encrypted vault.
        </p>
        <Button size="sm" variant="outline" onClick={handleClear} className="font-mono text-[11px]">
          Clear Active Keys
        </Button>
      </div>
    </div>
  );
}
