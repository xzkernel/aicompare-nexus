import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings, Key } from "lucide-react";
import { Link } from "react-router-dom";
import { useSecureApiKeys } from "@/lib/secure-api-keys";

interface NoAPIKeyBannerProps {
  className?: string;
}

export function NoAPIKeyBanner({ className = "", profileId = 'default' }: NoAPIKeyBannerProps & { profileId?: string }) {
  const { getApiKeyStatus } = useSecureApiKeys(profileId);
  const { hasValidKeys, missingKeys } = getApiKeyStatus();

  // Don't show banner if we have valid keys
  if (hasValidKeys) {
    return null;
  }

  return (
    <Alert variant="destructive" className={`mb-4 ${className}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>
            ⚠️ No API key found. Please add your keys in Settings to use the models.
          </span>
          {missingKeys.length > 0 && (
            <span className="text-xs opacity-75">
              Missing: {missingKeys.join(', ')}
            </span>
          )}
        </div>
        <Link to="/settings">
          <Button variant="outline" size="sm" className="ml-4">
            <Settings className="w-4 h-4 mr-2" />
            Go to Settings
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}