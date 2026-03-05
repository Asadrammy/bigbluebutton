export type Language = 'de' | 'en' | 'es' | 'fr' | 'ar' | 'nl' | 'it';

export type SignLanguage =
  | 'DGS'
  | 'ASL'
  | 'BSL'
  | 'LSF'
  | 'LIS'
  | 'LSE'
  | 'NGT'
  | 'OGS'
  | 'SSL';

export interface LanguageOption {
  code: Language;
  label: string;
  region: 'Germanic' | 'Romance' | 'Nordic' | 'MiddleEastern' | 'Anglophone' | 'Other';
}

export interface SignLanguageOption {
  code: SignLanguage;
  label: string;
  region: 'Germanic' | 'Anglophone' | 'Romance' | 'Nordic' | 'Other';
}

export interface TranslationRequest {
  text: string;
  sourceLang: Language;
  targetLang: Language;
}

export interface TranslationResponse {
  translatedText: string;
  sourceLang: Language;
  targetLang: Language;
}

export interface SpeechToTextRequest {
  audio_data: string; // base64 encoded audio (without data URI prefix)
  language?: Language;
}

export interface SpeechToTextResponse {
  text: string;
  language: Language;
  confidence: number;
}

export interface TextToSpeechRequest {
  text: string;
  targetLanguage: Language;
}

export interface TextToSpeechResponse {
  audioUrl: string;
  audioData?: string; // base64 encoded audio
}

export interface SignToTextRequest {
  videoFrames: string[]; // base64 encoded frames
  signLanguage: SignLanguage;
}

export interface SignToTextResponse {
  text: string;
  confidence: number;
  language: Language;
}

export interface TextToSignRequest {
  text: string;
  sourceLanguage: Language;
  signLanguage: SignLanguage;
}

export interface TextToSignResponse {
  animationData?: AnimationData;
  videoUrl?: string;
}

export interface AnimationData {
  duration: number;
  keyframes: Keyframe[];
  format: 'gltf' | 'json';
}

export interface Keyframe {
  time: number;
  bones: BoneTransform[];
}

export interface BoneTransform {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion
  scale: [number, number, number];
}

export interface ApiError {
  message: string;
  code: string;
  details?: any;
}

export interface AppSettings {
  preferredLanguage: Language;
  signLanguage: SignLanguage;
  videoQuality: 'low' | 'medium' | 'high';
  audioQuality: 'low' | 'medium' | 'high';
  themeMode: 'light' | 'dark' | 'system';
}

