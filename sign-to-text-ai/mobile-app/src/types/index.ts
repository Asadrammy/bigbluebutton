export type Language = 'de' | 'en' | 'es' | 'fr' | 'ar';

export type SignLanguage = 'DGS' | 'ASL';

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

