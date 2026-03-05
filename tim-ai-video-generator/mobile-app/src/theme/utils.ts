/**
 * Theme Utility Functions
 * Helper functions for working with themes
 */

import { Theme } from './theme';
import { ImageStyle, TextStyle, ViewStyle } from 'react-native';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Create themed styles that adapt to current theme
 * Usage:
 *   const useStyles = createThemedStyles((theme) => ({
 *     container: {
 *       backgroundColor: theme.colors.background,
 *       padding: theme.spacing.md,
 *     },
 *   }));
 *   
 *   // In component:
 *   const styles = useStyles();
 */
export function createThemedStyles<T extends NamedStyles<T>>(
  stylesFactory: (theme: Theme) => T
): (theme: Theme) => T {
  return (theme: Theme) => stylesFactory(theme);
}

/**
 * Get opacity color
 * Example: getOpacityColor('#FF0000', 0.5) => 'rgba(255, 0, 0, 0.5)'
 */
export function getOpacityColor(color: string, opacity: number): string {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  // Handle rgba colors
  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)$/g, `${opacity})`);
  }
  
  // Handle rgb colors
  if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
  }
  
  return color;
}

/**
 * Lighten or darken a color
 * amount: 0-100 (positive = lighten, negative = darken)
 */
export function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Get contrast color (black or white) for better readability
 */
export function getContrastColor(backgroundColor: string): '#000000' | '#FFFFFF' {
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Create a gradient color array
 */
export function createGradient(startColor: string, endColor: string, steps: number): string[] {
  const start = startColor.replace('#', '');
  const end = endColor.replace('#', '');
  
  const startRGB = {
    r: parseInt(start.substring(0, 2), 16),
    g: parseInt(start.substring(2, 4), 16),
    b: parseInt(start.substring(4, 6), 16),
  };
  
  const endRGB = {
    r: parseInt(end.substring(0, 2), 16),
    g: parseInt(end.substring(2, 4), 16),
    b: parseInt(end.substring(4, 6), 16),
  };
  
  const gradient: string[] = [];
  
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.round(startRGB.r + (endRGB.r - startRGB.r) * ratio);
    const g = Math.round(startRGB.g + (endRGB.g - startRGB.g) * ratio);
    const b = Math.round(startRGB.b + (endRGB.b - startRGB.b) * ratio);
    
    gradient.push(`#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`);
  }
  
  return gradient;
}

