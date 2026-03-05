/**
 * Environment Configuration
 * Manages environment variables and provides typed access
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Import environment variables from .env file
// @ts-ignore - react-native-dotenv types
import { 
  API_BASE_URL as ENV_API_BASE_URL,
  WS_BASE_URL as ENV_WS_BASE_URL,
  API_TIMEOUT as ENV_API_TIMEOUT,
  ENABLE_OFFLINE_MODE,
  ENABLE_ANALYTICS,
  ENABLE_CRASH_REPORTING,
  MAX_CACHE_SIZE_MB,
  CACHE_EXPIRY_DAYS,
  DEBUG_MODE,
  SHOW_API_LOGS,
  BBB_MEETING_URL as ENV_BBB_MEETING_URL,
  BBB_SUPPORT_URL as ENV_BBB_SUPPORT_URL,
} from '@env';

interface EnvironmentConfig {
  apiBaseUrl: string;
  apiTimeout: number;
  wsBaseUrl: string;
  bbbMeetingUrl: string;
  bbbSupportUrl: string;
  enableOfflineMode: boolean;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  maxCacheSizeMB: number;
  cacheExpiryDays: number;
  debugMode: boolean;
  showApiLogs: boolean;
}

/**
 * Get environment variable with proper fallback chain
 * Priority: .env file > app.json extra > default value
 */
function getEnvVar(key: string, defaultValue: string): string {
  // First try Constants.expoConfig.extra (from app.json)
  const fromExtra = Constants.expoConfig?.extra?.[key];
  if (fromExtra) return fromExtra;
  
  // Then try process.env (for runtime)
  const fromProcessEnv = process.env[key];
  if (fromProcessEnv) return fromProcessEnv;
  
  // Finally use default
  return defaultValue;
}

/**
 * Get API URL from environment
 * Reads from .env file first, then falls back to defaults
 */
function getDevApiUrl(): string {
  // Priority: .env file > Constants.extra > default
  const baseUrl = 
    ENV_API_BASE_URL || 
    getEnvVar('API_BASE_URL', 'http://192.168.1.9:8000/api/v1');
  
  // If using localhost and on a physical device, warn the developer
  if (baseUrl.includes('localhost') && !Platform.isTV) {
    console.warn(
      '⚠️ Using localhost in API URL. ' +
      'This will NOT work on physical devices! ' +
      'Update API_BASE_URL in .env to your computer\'s local IP (e.g., http://192.168.1.9:8000/api/v1)'
    );
  }
  
  return baseUrl;
}

/**
 * Get WebSocket URL from environment
 */
function getDevWsUrl(): string {
  return (
    ENV_WS_BASE_URL ||
    getEnvVar('WS_BASE_URL', 'ws://192.168.1.9:8000/ws')
  );
}

function getBbbMeetingUrl(): string {
  return (
    ENV_BBB_MEETING_URL ||
    getEnvVar('BBB_MEETING_URL', '')
  );
}

function getBbbSupportUrl(): string {
  return (
    ENV_BBB_SUPPORT_URL ||
    getEnvVar('BBB_SUPPORT_URL', 'https://bigbluebutton.org')
  );
}

/**
 * Environment configuration object
 * Reads from .env file with proper fallbacks
 */
export const config: EnvironmentConfig = {
  apiBaseUrl: getDevApiUrl(),
  apiTimeout: parseInt(
    ENV_API_TIMEOUT || getEnvVar('API_TIMEOUT', '30000'),
    10
  ),
  wsBaseUrl: getDevWsUrl(),
  bbbMeetingUrl: getBbbMeetingUrl(),
  bbbSupportUrl: getBbbSupportUrl(),
  enableOfflineMode: (
    ENABLE_OFFLINE_MODE || getEnvVar('ENABLE_OFFLINE_MODE', 'true')
  ) === 'true',
  enableAnalytics: (
    ENABLE_ANALYTICS || getEnvVar('ENABLE_ANALYTICS', 'false')
  ) === 'true',
  enableCrashReporting: (
    ENABLE_CRASH_REPORTING || getEnvVar('ENABLE_CRASH_REPORTING', 'false')
  ) === 'true',
  maxCacheSizeMB: parseInt(
    MAX_CACHE_SIZE_MB || getEnvVar('MAX_CACHE_SIZE_MB', '100'),
    10
  ),
  cacheExpiryDays: parseInt(
    CACHE_EXPIRY_DAYS || getEnvVar('CACHE_EXPIRY_DAYS', '7'),
    10
  ),
  debugMode: (
    DEBUG_MODE || getEnvVar('DEBUG_MODE', 'true')
  ) === 'true',
  showApiLogs: (
    SHOW_API_LOGS || getEnvVar('SHOW_API_LOGS', 'true')
  ) === 'true',
};

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return !config.debugMode && !__DEV__;
};

/**
 * Get API base URL
 */
export const getApiBaseUrl = (): string => {
  return config.apiBaseUrl;
};

/**
 * Get WebSocket base URL
 */
export const getWsBaseUrl = (): string => {
  return config.wsBaseUrl;
};

/**
 * Log configuration on app start (only in debug mode)
 */
if (config.debugMode && config.showApiLogs) {
  console.log('📱 App Configuration:', {
    apiBaseUrl: config.apiBaseUrl,
    wsBaseUrl: config.wsBaseUrl,
    platform: Platform.OS,
    debugMode: config.debugMode,
    offlineMode: config.enableOfflineMode,
  });
}

export default config;

