/**
 * Settings Context
 * Provides global access to app settings
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '@types/index';
import { getSettings, saveSettings } from '@services/settingsService';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  isInitialized: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({
    preferredLanguage: 'en',
    signLanguage: 'DGS',
    videoQuality: 'high',
    audioQuality: 'high',
    themeMode: 'system',
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await getSettings();
      setSettings(storedSettings);
      setIsInitialized(true);
    } catch (error) {
      console.error('Error loading settings:', error);
      setIsInitialized(true);
    }
  };

  const updateSettings = React.useCallback(async (newSettings: AppSettings) => {
    try {
      console.log('SettingsContext: Updating settings', { 
        newThemeMode: newSettings.themeMode 
      });
      await saveSettings(newSettings);
      // Force state update by creating a new object reference
      setSettings({ ...newSettings });
      console.log('SettingsContext: Settings updated successfully', newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    settings,
    updateSettings,
    isInitialized,
  }), [settings, updateSettings, isInitialized]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
