/**
 * Centralized Theme System
 * Includes colors, typography, spacing, shadows, etc.
 */

import { Colors, ThemeMode, ColorScheme } from './colors';

export interface Theme {
  mode: ThemeMode;
  colors: ColorScheme;
  spacing: typeof spacing;
  typography: typeof typography;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  animations: typeof animations;
  dimensions: typeof dimensions;
}

// Spacing System (4px base unit)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// Typography System
export const typography = {
  // Font Families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    hero: 32,
    display: 40,
  },
  
  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
} as const;

// Border Radius System
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

// Shadow System
export const shadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

// Animation Durations
export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 800,
} as const;

// Common Dimensions
export const dimensions = {
  // Touch Targets (Accessibility)
  touchTarget: {
    min: 44, // iOS minimum
    comfortable: 48, // Comfortable size
    large: 56, // Large buttons
  },
  
  // Button Heights
  button: {
    sm: 36,
    md: 44,
    lg: 52,
    xl: 60,
  },
  
  // Input Heights
  input: {
    sm: 36,
    md: 44,
    lg: 52,
  },
  
  // Icon Sizes
  icon: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
    xxl: 48,
  },
  
  // Avatar Sizes
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 72,
    xxl: 96,
  },
  
  // Screen Padding
  screenPadding: {
    horizontal: 20,
    vertical: 16,
  },
} as const;

// Create theme objects
export const lightTheme: Theme = {
  mode: 'light',
  colors: Colors.light,
  spacing,
  typography,
  borderRadius,
  shadows,
  animations,
  dimensions,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: Colors.dark,
  spacing,
  typography,
  borderRadius,
  shadows,
  animations,
  dimensions,
};

// Helper function to get theme
export const getTheme = (mode: ThemeMode): Theme => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

