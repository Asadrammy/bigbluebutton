export type SpokenLanguage = 'de' | 'en' | 'es' | 'fr' | 'ar';

export type SignLanguage =
  | 'DGS' | 'ASL' | 'JSL' | 'ÖGS' | 'DSGS' | 'LSF' | 'LSFB' | 'LSL' | 'LSR' | 'BSL' | 'ISL'
  | 'NGT' | 'VGT' | 'LSE' | 'LSC' | 'LSCV' | 'LGP' | 'LIS' | 'SMSL' | 'STS' | 'FSL' | 'FSGL'
  | 'NSL' | 'DTS' | 'ÍTM' | 'PJM' | 'ČZJ' | 'SPJ' | 'MJNY' | 'RSL-RO' | 'BSL-BG' | 'GSL'
  | 'TID' | 'RSL' | 'USL' | 'BSL-BY' | 'LSL-LT' | 'LSL-LV' | 'ESL' | 'SSL' | 'OGS';

export type QualityLevel = 'low' | 'medium' | 'high';

export interface ApiError {
  message: string;
  code: string;
  details?: unknown;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  preferred_language: SpokenLanguage;
  sign_language: SignLanguage;
  created_at: string;
}

export interface UserSettings {
  preferred_language: SpokenLanguage;
  sign_language: SignLanguage;
  video_quality: QualityLevel;
  audio_quality: QualityLevel;
  translator_defaults?: TranslatorDefaults | null;
  extra_settings?: Record<string, unknown> | null;
}

export interface TranslatorDefaults {
  sign_to_text_language?: SignLanguage;
  speech_to_sign_spoken_language?: SpokenLanguage;
  speech_to_sign_sign_language?: SignLanguage;
  text_source_language?: SpokenLanguage;
  text_target_language?: SpokenLanguage;
}

export interface BoneTransform {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
}

export interface Keyframe {
  time: number;
  bones: BoneTransform[];
}

export interface AnimationData {
  duration: number;
  keyframes: Keyframe[];
  format: 'gltf' | 'json' | string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
  expires_in?: number;
}

export interface TranslationRequest {
  text: string;
  source_lang: SpokenLanguage;
  target_lang: SpokenLanguage;
}

export interface TranslationResponse {
  translated_text: string;
  source_lang: SpokenLanguage;
  target_lang: SpokenLanguage;
}

export interface SignToTextRequest {
  video_frames: string[];
  sign_language?: SignLanguage;
}

export interface SignToTextResponse {
  text: string;
  language: SpokenLanguage;
  confidence: number;
}

export interface SpeechToTextRequest {
  audio_data: string;
  language?: SpokenLanguage;
}

export interface SpeechToTextResponse {
  text: string;
  language: SpokenLanguage;
  confidence: number;
}

export interface TextToSpeechRequest {
  text: string;
  target_language: SpokenLanguage;
}

export interface TextToSpeechResponse {
  audio_url?: string;
  audio_data?: string;
}

export interface TextToSignRequest {
  text: string;
  source_language?: SpokenLanguage;
  sign_language?: SignLanguage;
}

export interface TextToSignResponse {
  animation_data?: AnimationData | null;
  video_url?: string;
}

export interface TranslationHistoryEntry {
  id: number;
  source_text: string;
  target_text: string;
  source_language: string;
  target_language: string;
  translation_type: 'text' | 'speech' | 'sign' | string;
  confidence?: number | null;
  processing_time?: number | null;
  created_at: string;
}

export interface TranslationHistoryListResponse {
  items: TranslationHistoryEntry[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface HistoryStatsResponse {
  total_translations: number;
  total_by_type: Record<string, number>;
  total_by_language: Record<string, number>;
  avg_confidence?: number | null;
  avg_processing_time?: number | null;
}

export interface SignListResponse {
  success: boolean;
  data: {
    signs: string[];
    count: number;
  };
}

export interface SignInfoResponse {
  success: boolean;
  data: {
    name: string;
    description: string;
    duration: number;
    keyframes: Array<{
      time: number;
      bone: string;
      position?: [number, number, number];
      rotation?: [number, number, number, number];
      scale?: [number, number, number];
    }>;
  };
}
