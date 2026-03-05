/**
 * Settings Service
 * Manages app settings with AsyncStorage persistence
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, SignLanguage, AppSettings } from '@types/index';

const SETTINGS_KEY = '@app:settings';

const DEFAULT_SETTINGS: AppSettings = {
  preferredLanguage: 'en',
  signLanguage: 'DGS',
  videoQuality: 'high',
  audioQuality: 'high',
  themeMode: 'system',
};

/**
 * Get settings from storage
 */
export const getSettings = async (): Promise<AppSettings> => {
  try {
    const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      return JSON.parse(storedSettings);
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Save settings to storage
 */
export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

/**
 * Update a specific setting
 */
export const updateSetting = async <K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> => {
  const currentSettings = await getSettings();
  const updatedSettings = { ...currentSettings, [key]: value };
  await saveSettings(updatedSettings);
};

/**
 * Get a specific setting with default fallback
 */
export const getSetting = async <K extends keyof AppSettings>(
  key: K
): Promise<AppSettings[K]> => {
  const settings = await getSettings();
  return settings[key];
};

/**
 * Reset settings to defaults
 */
export const resetSettings = async (): Promise<void> => {
  await saveSettings(DEFAULT_SETTINGS);
};
