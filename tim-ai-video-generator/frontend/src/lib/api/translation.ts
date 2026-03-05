import { apiRequest } from '@/lib/api/client';
import type {
  SignInfoResponse,
  SignListResponse,
  SignToTextRequest,
  SignToTextResponse,
  SpeechToTextRequest,
  SpeechToTextResponse,
  TextToSignRequest,
  TextToSignResponse,
  TextToSpeechRequest,
  TextToSpeechResponse,
  TranslationRequest,
  TranslationResponse,
} from '@/lib/api/types';

export function signToText(payload: SignToTextRequest) {
  return apiRequest<SignToTextResponse>('/sign-to-text', {
    method: 'POST',
    body: payload,
  });
}

export function speechToText(payload: SpeechToTextRequest) {
  return apiRequest<SpeechToTextResponse>('/speech-to-text', {
    method: 'POST',
    body: payload,
  });
}

export function textToSpeech(payload: TextToSpeechRequest) {
  return apiRequest<TextToSpeechResponse>('/text-to-speech', {
    method: 'POST',
    body: payload,
  });
}

export function textToSign(payload: TextToSignRequest) {
  return apiRequest<TextToSignResponse>('/text-to-sign', {
    method: 'POST',
    body: payload,
  });
}

export function fetchAvailableSigns() {
  return apiRequest<SignListResponse>('/text-to-sign/signs', {
    method: 'GET',
  });
}

export function fetchSignInfo(signName: string) {
  return apiRequest<SignInfoResponse>(`/text-to-sign/sign/${encodeURIComponent(signName)}`, {
    method: 'GET',
  });
}

export function translate(payload: TranslationRequest) {
  return apiRequest<TranslationResponse>('/translate', {
    method: 'POST',
    body: payload,
  });
}
