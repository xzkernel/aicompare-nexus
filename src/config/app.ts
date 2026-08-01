/**
 * Application configuration for ModelWise
 */

interface AppConfig {
  APP_VERSION: string;
}

const defaultConfig: AppConfig = {
  APP_VERSION: '1.0.0',
};

const getConfig = (): AppConfig => {
  return defaultConfig;
};

export const config = getConfig();


