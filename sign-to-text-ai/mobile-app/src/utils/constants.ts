import { Language, SignLanguage } from '@types/index';
import { getApiBaseUrl } from '@config/environment';

export const API_BASE_URL = getApiBaseUrl();

export const LANGUAGES: Record<Language, string> = {
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
};

export const SIGN_LANGUAGES: Record<SignLanguage, string> = {
  DGS: 'Deutsche Gebärdensprache',
  ASL: 'American Sign Language',
};

export const COLORS = {
  primary: '#4A90E2',
  secondary: '#50C878',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#333333',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#E74C3C',
  success: '#2ECC71',
  textInverse: '#FFFFFF',
  warning: '#F39C12',
};

export const FONT_SIZES = {
  small: 12,
  medium: 16,
  large: 20,
  xlarge: 24,
  xxlarge: 32,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

