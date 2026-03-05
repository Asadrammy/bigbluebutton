/**
 * Centralized Color System
 * All colors defined here for easy management
 */

export const Colors = {
  // Light Theme Colors
  light: {
    // Primary Colors
    primary: '#4A90E2',        // Blue - Main actions, buttons
    primaryLight: '#6BA3E8',   // Lighter blue for hover/pressed
    primaryDark: '#3A7BC8',    // Darker blue for contrast
    
    secondary: '#50C878',      // Green - Success, positive actions
    secondaryLight: '#6FD98E', // Light green
    secondaryDark: '#3FAF5E',  // Dark green
    
    accent: '#9B59B6',         // Purple - Highlights, special features
    accentLight: '#B07CC6',    // Light purple
    accentDark: '#7D3C98',     // Dark purple
    
    // Header Color
    header: '#72C0E9',         // Light blue - Navigation headers
    
    // Semantic Colors
    success: '#50C878',        // Green - Success states
    warning: '#FFA500',        // Orange - Warnings, cautions
    error: '#FF6B6B',          // Red - Errors, destructive actions
    info: '#4A90E2',           // Blue - Information
    
    // Recording/Active States
    recording: '#FF4444',      // Bright red - Active recording
    processing: '#4A90E2',     // Blue - Processing/loading
    ready: '#50C878',          // Green - Ready state
    inactive: '#95A5A6',       // Gray - Inactive/disabled
    
    // Background Colors
    background: '#FFFFFF',     // Main app background (white)
    backgroundSecondary: '#FFFFFF', // Cards, modals (white)
    backgroundTertiary: '#F8F9FA',  // Subtle backgrounds
    
    // Surface Colors (for cards, sheets)
    surface: '#FFFFFF',        // Card backgrounds
    surfaceVariant: '#F8F9FA', // Alternative card backgrounds
    surfaceElevated: '#FFFFFF', // Elevated surfaces (with shadow)
    
    // Text Colors
    text: '#2C3E50',           // Primary text (dark gray)
    textSecondary: '#7F8C8D',  // Secondary text (medium gray)
    textTertiary: '#95A5A6',   // Tertiary text (light gray)
    textDisabled: '#BDC3C7',   // Disabled text
    textInverse: '#FFFFFF',    // White text (on dark backgrounds)
    
    // Border & Divider Colors
    border: '#E0E0E0',         // Default borders
    borderLight: '#F0F0F0',    // Subtle borders
    borderDark: '#D0D0D0',     // Strong borders
    divider: '#ECEFF1',        // Divider lines
    
    // Sign Language Specific
    signDetected: '#50C878',   // Green - Hand detected
    signRecognizing: '#4A90E2', // Blue - Processing sign
    signConfident: '#2ECC71',  // Bright green - High confidence
    signLowConfidence: '#F39C12', // Orange - Low confidence
    
    // Avatar & Animation
    avatarBackground: '#F5F5F5', // Avatar container background
    avatarSkin: '#FFD1A4',     // Default avatar skin tone
    avatarOutline: '#4A90E2',  // Avatar outline/border
    
    // Overlays & Shadows
    overlay: 'rgba(0, 0, 0, 0.5)',    // Modal overlays
    overlayLight: 'rgba(0, 0, 0, 0.3)', // Lighter overlays
    shadow: 'rgba(0, 0, 0, 0.1)',     // Shadow color
    shadowDark: 'rgba(0, 0, 0, 0.2)',  // Darker shadow
    
    // Special Effects
    shimmer: '#E8E8E8',        // Shimmer/skeleton loading
    gradient: ['#4A90E2', '#9B59B6'], // Gradient colors
    
    // Accessibility High Contrast (optional mode)
    highContrastText: '#000000',
    highContrastBackground: '#FFFFFF',
    highContrastBorder: '#000000',
  },
  
  // Dark Theme Colors
  dark: {
    // Primary Colors
    primary: '#5BA3F5',        // Lighter blue for dark mode
    primaryLight: '#7BB8F7',   // Even lighter
    primaryDark: '#4A90E2',    // Darker variant
    
    secondary: '#5FDB87',      // Lighter green for dark mode
    secondaryLight: '#7FE19D', // Light green
    secondaryDark: '#50C878',  // Dark green
    
    accent: '#B07CC6',         // Lighter purple for dark mode
    accentLight: '#C692D6',    // Light purple
    accentDark: '#9B59B6',     // Dark purple
    
    // Header Color
    header: '#72C0E9',         // Light blue - Navigation headers (same for dark mode)
    
    // Semantic Colors (adjusted for dark mode)
    success: '#5FDB87',        // Lighter green
    warning: '#FFB84D',        // Lighter orange
    error: '#FF7B7B',          // Lighter red
    info: '#5BA3F5',           // Lighter blue
    
    // Recording/Active States
    recording: '#FF5555',      // Bright red (visible on dark)
    processing: '#5BA3F5',     // Lighter blue
    ready: '#5FDB87',          // Lighter green
    inactive: '#6C7A89',       // Lighter gray
    
    // Background Colors (from design)
    background: '#001C29',     // Very dark desaturated blue
    backgroundSecondary: '#0E2F3F', // Dark desaturated blue-teal
    backgroundTertiary: '#194054',  // Slightly lighter desaturated blue-teal
    
    // Surface Colors
    surface: '#0E2F3F',        // Card backgrounds (dark blue-teal)
    surfaceVariant: '#194054', // Alternative cards (lighter blue-teal)
    surfaceElevated: '#1F4A5F', // Elevated surfaces (slightly lighter)
    
    // Text Colors (from design)
    text: '#D3D9DC',           // Very light desaturated gray (primary text)
    textSecondary: '#9EA8AE',  // Medium desaturated gray (secondary text)
    textTertiary: '#69808C',   // Medium-dark desaturated blue-gray (tertiary text)
    textDisabled: '#4A5A66',    // Darker gray for disabled
    textInverse: '#001C29',    // Dark background color (on light backgrounds)
    
    // Border & Divider Colors
    border: '#0E2F3F',         // Match secondary background
    borderLight: '#194054',    // Lighter border
    borderDark: '#001C29',     // Darker border
    divider: '#0E2F3F',        // Divider lines (match border)
    
    // Sign Language Specific
    signDetected: '#5FDB87',   // Lighter green
    signRecognizing: '#5BA3F5', // Lighter blue
    signConfident: '#3FDB71',  // Bright green
    signLowConfidence: '#FFB84D', // Light orange
    
    // Avatar & Animation
    avatarBackground: '#0E2F3F', // Match surface color
    avatarSkin: '#E8B890',     // Adjusted skin tone for dark mode
    avatarOutline: '#5BA3F5',  // Lighter blue outline
    
    // Overlays & Shadows
    overlay: 'rgba(0, 28, 41, 0.8)',    // Darker overlay using background color
    overlayLight: 'rgba(0, 28, 41, 0.6)', // Medium overlay
    shadow: 'rgba(0, 28, 41, 0.5)',     // Shadow using background color
    shadowDark: 'rgba(0, 28, 41, 0.7)',  // Very dark shadow
    
    // Special Effects
    shimmer: '#194054',        // Match tertiary background for shimmer
    gradient: ['#5BA3F5', '#B07CC6'], // Lighter gradient
    
    // Accessibility High Contrast
    highContrastText: '#FFFFFF',
    highContrastBackground: '#000000',
    highContrastBorder: '#FFFFFF',
  },
} as const;

// Color usage guide
export const ColorUsage = {
  // When to use each color:
  primary: 'Main actions, CTAs, active states, navigation highlights',
  secondary: 'Success states, positive feedback, confirmation',
  accent: 'Special features, highlights, premium content',
  error: 'Errors, destructive actions, critical warnings',
  warning: 'Cautions, important notices, requires attention',
  success: 'Success messages, completed actions, positive feedback',
  info: 'Information, neutral messages, hints',
  
  // Backgrounds:
  background: 'Main screen background',
  surface: 'Cards, modals, bottom sheets',
  overlay: 'Modals, dialogs, dimmed backgrounds',
  
  // Text:
  text: 'Primary body text, headlines',
  textSecondary: 'Supporting text, captions',
  textTertiary: 'Hints, placeholders, timestamps',
};

export type ThemeMode = 'light' | 'dark';
export type ColorScheme = typeof Colors.light;

