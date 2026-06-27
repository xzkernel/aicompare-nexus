import { AlertCircle, CheckCircle, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiKeyHealthCheck } from "@/components/ApiKeyHealthCheck";
import { SettingsPanel, SettingsKeyField, RoutingToggle } from "./SettingsLayout";
import type { SettingsHandlersProps } from "./settings-props";

export function SettingsApiKeysSection(props: SettingsHandlersProps) {
  const {
    profileId,
    apiKeys,
    showKeys,
    toggleKeyVisibility,
    handleKeyChange,
    handleMetaRelayChange,
    handleCustomConfigChange,
    handleSave,
    handleClear,
    isLoading,
    hasValidKeys,
    openaiValid,
    googleValid,
    anthropicValid,
    metaValid,
    customValid,
    setApiKeys,
  } = props;

  return (
    <div className="space-y-3">
      {hasValidKeys ? (
        <Alert className="border-stroke-subtle bg-bg-soft/50">
          <CheckCircle className="h-4 w-4 text-accent-green" />
          <AlertDescription className="font-mono text-[11px]">
            At least one valid key configured — playground routing is active.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-mono text-[11px]">
            No valid API keys. Add credentials below to enable model evaluation.
          </AlertDescription>
        </Alert>
      )}

      <SettingsPanel title="OpenAI" description="GPT family · direct API" icon={Key} status={{ label: openaiValid ? "connected" : "offline", ok: openaiValid }}>
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
          hint='Prefix "sk-" · client-side only'
        />
      </SettingsPanel>

      <SettingsPanel title="Google Gemini" description="Gemini models" icon={Key} status={{ label: googleValid ? "connected" : "offline", ok: googleValid }}>
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
            onChange={(id) => setApiKeys({ ...apiKeys, googleProvider: id as "google" | "openrouter" })}
            options={[
              { id: "google", label: "Direct" },
              { id: "openrouter", label: "OpenRouter" },
            ]}
          />
        </div>
      </SettingsPanel>

      <SettingsPanel title="Anthropic Claude" description="Claude models" icon={Key} status={{ label: anthropicValid ? "connected" : "offline", ok: anthropicValid }}>
        <div className="space-y-3">
          <RoutingToggle
            label="Routing mode"
            value={apiKeys.claudeProvider || "anthropic"}
            onChange={(id) => setApiKeys({ ...apiKeys, claudeProvider: id as "anthropic" | "openrouter" })}
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
              Claude routes via OpenRouter — use Meta relay key below.
            </p>
          )}
        </div>
      </SettingsPanel>

      <SettingsPanel title="Meta / OpenRouter" description="Llama & relay models" icon={Key} status={{ label: metaValid ? "connected" : "offline", ok: metaValid }}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="mw-label-mono text-text-muted">Relay service</span>
            <Select value={apiKeys.metaRelayProvider} onValueChange={handleMetaRelayChange}>
              <SelectTrigger className="h-9 border-stroke-subtle bg-bg-soft font-mono text-[12px]">
                <SelectValue placeholder="Select relay" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="together">Together AI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SettingsKeyField
            id="meta-key"
            label="Relay API key"
            value={apiKeys.metaRelayKey}
            placeholder="sk-..."
            visible={showKeys.metaRelayKey}
            onToggleVisible={() => toggleKeyVisibility("metaRelayKey")}
            onChange={(v) => handleKeyChange("metaRelayKey", v)}
            valid={metaValid}
            helpUrl="https://openrouter.ai/keys"
          />
        </div>
      </SettingsPanel>

      <SettingsPanel title="Custom HTTP" description="OpenAI-compatible endpoint" icon={Key} status={{ label: customValid ? "connected" : "offline", ok: customValid }}>
        <div className="space-y-3">
          <SettingsKeyField
            id="custom-base-url"
            label="Base URL"
            value={apiKeys.customApiConfig?.baseUrl || ""}
            placeholder="https://api.example.com"
            visible
            onToggleVisible={() => {}}
            onChange={(v) => handleCustomConfigChange("baseUrl", v)}
          />
          <SettingsKeyField
            id="custom-key-header"
            label="Key header"
            value={apiKeys.customApiConfig?.keyHeader || "Authorization"}
            placeholder="Authorization"
            visible
            onToggleVisible={() => {}}
            onChange={(v) => handleCustomConfigChange("keyHeader", v)}
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

      <div className="flex flex-wrap gap-2 border border-stroke-subtle bg-bg-soft/30 p-3">
        <Button size="sm" onClick={handleSave} disabled={isLoading} className="font-mono text-[11px]">
          {isLoading ? "Saving…" : "Save keys to browser"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleClear} className="font-mono text-[11px]">
          Clear all keys
        </Button>
      </div>

      <div className="border border-stroke-subtle p-3">
        <ApiKeyHealthCheck profileId={profileId} />
      </div>
    </div>
  );
}
