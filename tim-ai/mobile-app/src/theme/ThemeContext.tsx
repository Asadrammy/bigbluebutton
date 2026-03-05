/**
 * Theme Context & Provider
 * Manages theme state and system preference detection
 * Based on EVCharging app implementation pattern
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, lightTheme, darkTheme } from './theme';
import { ThemeMode } from './colors';
import { useSettings } from '@contexts/SettingsContext';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
  isSystemTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = '@app_theme_mode';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useSystemColorScheme();
  const { settings, updateSettings, isInitialized: settingsInitialized } = useSettings();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved theme preference from AsyncStorage on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        console.log('ThemeContext: Loading theme preference from storage...');
        // First try to load from AsyncStorage (direct storage)
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!isMounted) return;
        
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          console.log('ThemeContext: Loaded from AsyncStorage:', saved);
          setThemePreferenceState(saved);
          setIsInitialized(true);
        } else {
          // First launch - no saved preference, use 'system' to follow system theme
          console.log('ThemeContext: First launch detected, defaulting to system theme');
          setThemePreferenceState('system');
          // Don't save 'system' to AsyncStorage on first launch - let it remain null
          // This way we know it's truly the first launch
          setIsInitialized(true);
        }
      } catch (e) {
        console.error('Error loading theme preference:', e);
        if (isMounted) {
          // On error, default to system theme (follows system preference)
          setThemePreferenceState('system');
          setIsInitialized(true);
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Sync with settings context when it changes (for settings screen updates)
  // This is the PRIMARY way theme changes from Settings screen
  useEffect(() => {
    // Wait for both ThemeContext and SettingsContext to be initialized
    if (!isInitialized || !settingsInitialized) {
      return;
    }

    const settingsTheme = settings?.themeMode;
    console.log('ThemeContext: Settings effect triggered', { 
      settingsTheme,
      currentThemePreference: themePreference,
      isInitialized,
      settingsInitialized,
    });
    
    if (settingsTheme && (settingsTheme === 'light' || settingsTheme === 'dark' || settingsTheme === 'system')) {
      const newPreference = settingsTheme as ThemePreference;
      
      // Sync if different (user changed theme from settings)
      if (newPreference !== themePreference) {
        console.log('ThemeContext: ✅ Syncing theme preference from settings', { 
          from: themePreference, 
          to: newPreference 
        });
        setThemePreferenceState(newPreference);
        // Save to AsyncStorage when user explicitly changes theme
        AsyncStorage.setItem(THEME_STORAGE_KEY, newPreference).catch(() => {});
      }
    }
  }, [settings?.themeMode, settingsInitialized, themePreference, isInitialized]);

  // Calculate effective theme mode (resolves 'system' to actual light/dark)
  const effectiveThemeMode: ThemeMode = React.useMemo(() => {
    const mode = themePreference === 'system' 
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : themePreference;
    console.log('ThemeContext: Effective theme mode calculated', { 
      themePreference, 
      systemColorScheme, 
      effectiveMode: mode 
    });
    return mode;
  }, [themePreference, systemColorScheme]);

  // Get theme object based on effective mode
  const theme = React.useMemo(() => {
    const selectedTheme = effectiveThemeMode === 'dark' ? darkTheme : lightTheme;
    console.log('ThemeContext: Theme object selected', { 
      effectiveThemeMode, 
      backgroundColor: selectedTheme.colors.background 
    });
    return selectedTheme;
  }, [effectiveThemeMode]);

  // Persist theme preference to both AsyncStorage and SettingsContext
  const setThemePreference = React.useCallback(async (preference: ThemePreference) => {
    try {
      console.log('Setting theme preference:', preference);
      setThemePreferenceState(preference);
      
      // Save to AsyncStorage immediately
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
      
      // Also update SettingsContext for consistency
      if (settings) {
        const newSettings = { ...settings, themeMode: preference };
        await updateSettings(newSettings);
      }
      
      console.log('Theme preference saved:', preference);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, [settings, updateSettings]);

  const toggleTheme = React.useCallback(async () => {
    const newMode = themePreference === 'light' ? 'dark' : themePreference === 'dark' ? 'system' : 'light';
    await setThemePreference(newMode);
  }, [themePreference, setThemePreference]);

  const isSystemTheme = themePreference === 'system';

  // Create context value - ALWAYS create new object to force re-renders
  // Don't use useMemo - create fresh object every render so React detects changes
  const value: ThemeContextType = React.useMemo(() => {
    const contextValue = {
      theme,
      themeMode: effectiveThemeMode,
      themePreference,
      setThemePreference,
      toggleTheme,
      isSystemTheme,
    };
    console.log('ThemeContext: Creating context value', { 
      themePreference, 
      effectiveThemeMode, 
      backgroundColor: theme.colors.background,
      valueRef: 'new'
    });
    return contextValue;
  }, [theme, effectiveThemeMode, themePreference, isSystemTheme, setThemePreference, toggleTheme]);
  
  // Force re-render when theme changes by logging
  React.useEffect(() => {
    console.log('ThemeContext: Theme state changed', {
      themePreference,
      effectiveThemeMode,
      backgroundColor: theme.colors.background
    });
  }, [themePreference, effectiveThemeMode, theme.colors.background]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Custom hook to use theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Convenience hook to get just the theme object
export const useAppTheme = (): Theme => {
  const { theme } = useTheme();
  return theme;
};

// Hook to get colors directly
export const useColors = () => {
  const { theme } = useTheme();
  return theme.colors;
};

// Hook to get spacing
export const useSpacing = () => {
  const { theme } = useTheme();
  return theme.spacing;
};

// Hook to get typography
export const useTypography = () => {
  const { theme } = useTheme();
  return theme.typography;
};

