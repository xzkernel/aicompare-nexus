import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useSecureApiKeys } from '@/lib/secure-api-keys';

interface HealthCheckResult {
  provider: 'openai' | 'gemini';
  status: 'valid' | 'invalid' | 'quota_exceeded' | 'rate_limited' | 'error';
  message: string;
  lastChecked: Date;
}

export function ApiKeyHealthCheck({ profileId = 'default' }: { profileId?: string }) {
  const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const { getApiKey, getApiKeyStatus } = useSecureApiKeys(profileId);

  const checkApiKeyHealth = async (provider: 'openai' | 'gemini', apiKey: string): Promise<HealthCheckResult> => {
    try {
      if (provider === 'openai') {
        // Test OpenAI API with a minimal request
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          return {
            provider,
            status: 'valid',
            message: 'API key is valid and working',
            lastChecked: new Date()
          };
        } else if (response.status === 401) {
          return {
            provider,
            status: 'invalid',
            message: 'Invalid API key',
            lastChecked: new Date()
          };
        } else if (response.status === 429) {
          return {
            provider,
            status: 'rate_limited',
            message: 'Rate limit exceeded',
            lastChecked: new Date()
          };
        } else if (response.status === 402) {
          return {
            provider,
            status: 'quota_exceeded',
            message: 'Quota exceeded - check billing',
            lastChecked: new Date()
          };
        } else {
          return {
            provider,
            status: 'error',
            message: `API error: ${response.status}`,
            lastChecked: new Date()
          };
        }
      } else if (provider === 'gemini') {
        // Test Gemini API with a minimal request
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'GET'
        });

        const url = new URL(response.url);
        url.searchParams.set('key', apiKey);
        
        const testResponse = await fetch(url.toString(), {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (testResponse.status === 200) {
          return {
            provider,
            status: 'valid',
            message: 'API key is valid and working',
            lastChecked: new Date()
          };
        } else if (testResponse.status === 400) {
          return {
            provider,
            status: 'invalid',
            message: 'Invalid API key',
            lastChecked: new Date()
          };
        } else if (testResponse.status === 429) {
          return {
            provider,
            status: 'rate_limited',
            message: 'Rate limit exceeded',
            lastChecked: new Date()
          };
        } else if (testResponse.status === 403) {
          return {
            provider,
            status: 'quota_exceeded',
            message: 'Quota exceeded - check billing',
            lastChecked: new Date()
          };
        } else {
          return {
            provider,
            status: 'error',
            message: `API error: ${testResponse.status}`,
            lastChecked: new Date()
          };
        }
      }
    } catch (error) {
      return {
        provider,
        status: 'error',
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date()
      };
    }

    return {
      provider,
      status: 'error',
      message: 'Unknown provider',
      lastChecked: new Date()
    };
  };

  const runHealthCheck = async () => {
    setIsChecking(true);
    const results: HealthCheckResult[] = [];

    const openaiKey = getApiKey('openai');
    const geminiKey = getApiKey('gemini');

    if (openaiKey) {
      const result = await checkApiKeyHealth('openai', openaiKey);
      results.push(result);
    }

    if (geminiKey) {
      const result = await checkApiKeyHealth('gemini', geminiKey);
      results.push(result);
    }

    setHealthResults(results);
    setIsChecking(false);
  };

  const getStatusIcon = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'quota_exceeded':
      case 'rate_limited':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'valid':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Valid</Badge>;
      case 'invalid':
        return <Badge variant="destructive">Invalid</Badge>;
      case 'quota_exceeded':
        return <Badge variant="destructive">Quota Exceeded</Badge>;
      case 'rate_limited':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Rate Limited</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const { hasValidKeys } = getApiKeyStatus();

  if (!hasValidKeys) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <XCircle className="w-4 h-4" />
        <span>No API keys configured</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">API Key Health</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={runHealthCheck}
          disabled={isChecking}
        >
          {isChecking ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          Check Health
        </Button>
      </div>

      {healthResults.length > 0 && (
        <div className="space-y-2">
          {healthResults.map((result) => (
            <div
              key={result.provider}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(result.status)}
                <div>
                  <div className="font-medium capitalize">
                    {result.provider === 'openai' ? 'OpenAI' : 'Google AI'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {result.message}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last checked: {result.lastChecked.toLocaleTimeString()}
                  </div>
                </div>
              </div>
              {getStatusBadge(result.status)}
            </div>
          ))}
        </div>
      )}

      {healthResults.length === 0 && !isChecking && (
        <div className="text-sm text-muted-foreground">
          Click "Check Health" to verify your API keys
        </div>
      )}
    </div>
  );
}


