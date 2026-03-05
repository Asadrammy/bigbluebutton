import type { Language, SignLanguage, LanguageOption, SignLanguageOption } from '@types';
import { getApiBaseUrl } from '@config/environment';

export const API_BASE_URL = getApiBaseUrl();

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'de', label: 'Deutsch', region: 'Germanic' },
  { code: 'en', label: 'English', region: 'Anglophone' },
  { code: 'es', label: 'Español', region: 'Romance' },
  { code: 'fr', label: 'Français', region: 'Romance' },
  { code: 'ar', label: 'العربية', region: 'MiddleEastern' },
  { code: 'nl', label: 'Nederlands', region: 'Germanic' },
  { code: 'it', label: 'Italiano', region: 'Romance' },
];

export const LANGUAGES: Record<Language, string> = LANGUAGE_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.code]: option.label }),
  {} as Record<Language, string>
);

export const SIGN_LANGUAGE_OPTIONS: SignLanguageOption[] = [
  { code: 'DGS', label: 'Deutsche Gebärdensprache', region: 'Germanic' },
  { code: 'ASL', label: 'American Sign Language', region: 'Anglophone' },
  { code: 'BSL', label: 'British Sign Language', region: 'Anglophone' },
  { code: 'LSF', label: 'Langue des Signes Française', region: 'Romance' },
  { code: 'LIS', label: 'Lingua dei Segni Italiana', region: 'Romance' },
  { code: 'LSE', label: 'Lengua de Signos Española', region: 'Romance' },
  { code: 'NGT', label: 'Nederlandse Gebarentaal', region: 'Germanic' },
  { code: 'OGS', label: 'Österreichische Gebärdensprache', region: 'Germanic' },
  { code: 'SSL', label: 'Svenskt Teckenspråk', region: 'Nordic' },
];

export const SIGN_LANGUAGES: Record<SignLanguage, string> = SIGN_LANGUAGE_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.code]: option.label }),
  {} as Record<SignLanguage, string>
);

export const GROUPED_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.reduce(
  (acc, option) => {
    const key = option.region;
    if (!acc[key]) acc[key] = [];
    acc[key].push(option);
    return acc;
  },
  {} as Record<LanguageOption['region'], LanguageOption[]>
);

export const GROUPED_SIGN_LANGUAGE_OPTIONS = SIGN_LANGUAGE_OPTIONS.reduce(
  (acc, option) => {
    const key = option.region;
    if (!acc[key]) acc[key] = [];
    acc[key].push(option);
    return acc;
  },
  {} as Record<SignLanguageOption['region'], SignLanguageOption[]>
);

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

