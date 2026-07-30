/**
 * Application configuration for ModelWise
 */

export interface AppConfig {
  // Open Source BYOK mode - when true, all providers are enabled and user provides their own keys
  OPEN_SOURCE_BYOK: boolean;
  
  // Application metadata
  APP_NAME: string;
  APP_VERSION: string;
  
  // Feature flags
  ENABLE_ANALYTICS: boolean;
  ENABLE_EXPORT: boolean;
}

type RuntimeEnv = Partial<Record<keyof AppConfig, string>>;

// Default configuration
const defaultConfig: AppConfig = {
  OPEN_SOURCE_BYOK: true, // Enable BYOK mode by default
  APP_NAME: 'ModelWise',
  APP_VERSION: '1.0.0',
  ENABLE_ANALYTICS: false,
  ENABLE_EXPORT: true,
};

// Environment-based configuration
const getConfig = (): AppConfig => {
  // Check for environment variables or build-time configuration
  const envConfig: Partial<AppConfig> = {};
  
  // Override with environment variables if available
  if (typeof window !== 'undefined') {
    // Browser environment
    const env = (window as Window & { __ENV__?: RuntimeEnv }).__ENV__ || {};
    envConfig.OPEN_SOURCE_BYOK = env.OPEN_SOURCE_BYOK !== 'false';
    envConfig.ENABLE_ANALYTICS = env.ENABLE_ANALYTICS === 'true';
    envConfig.ENABLE_EXPORT = env.ENABLE_EXPORT !== 'false';
  } else {
    // Server-side or build-time
    envConfig.OPEN_SOURCE_BYOK = process.env.VITE_OPEN_SOURCE_BYOK !== 'false';
    envConfig.ENABLE_ANALYTICS = process.env.VITE_ENABLE_ANALYTICS === 'true';
    envConfig.ENABLE_EXPORT = process.env.VITE_ENABLE_EXPORT !== 'false';
  }
  
  return {
    ...defaultConfig,
    ...envConfig,
  };
};

export const config = getConfig();

// Helper functions
export const isBYOKMode = (): boolean => config.OPEN_SOURCE_BYOK;
export const isAnalyticsEnabled = (): boolean => config.ENABLE_ANALYTICS;
export const isExportEnabled = (): boolean => config.ENABLE_EXPORT;


