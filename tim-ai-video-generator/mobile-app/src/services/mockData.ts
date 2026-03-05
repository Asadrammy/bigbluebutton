import {
  SignToTextResponse,
  SpeechToTextResponse,
  TextToSpeechResponse,
  TextToSignResponse,
  TranslationResponse,
} from '@types/index';

// Mock data for testing UI without backend

export const mockSignToText = async (): Promise<SignToTextResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    text: 'Hallo, wie geht es dir?',
    confidence: 0.92,
    language: 'de',
  };
};

export const mockSpeechToText = async (): Promise<SpeechToTextResponse> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    text: 'Hello, how are you?',
    language: 'en',
    confidence: 0.95,
  };
};

export const mockTextToSpeech = async (): Promise<TextToSpeechResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    audioUrl: 'https://example.com/audio.mp3',
    audioData: undefined, // In real scenario, this would be base64 audio
  };
};

export const mockTextToSign = async (): Promise<TextToSignResponse> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    animationData: {
      duration: 3.5,
      format: 'json',
      keyframes: [
        {
          time: 0,
          bones: [
            {
              name: 'rightHand',
              position: [0, 0, 0],
              rotation: [0, 0, 0, 1],
              scale: [1, 1, 1],
            },
          ],
        },
        {
          time: 1.0,
          bones: [
            {
              name: 'rightHand',
              position: [0.5, 1.0, 0.2],
              rotation: [0, 0.7, 0, 0.7],
              scale: [1, 1, 1],
            },
          ],
        },
      ],
    },
  };
};

export const mockTranslate = async (): Promise<TranslationResponse> => {
  await new Promise(resolve => setTimeout(resolve, 700));
  
  return {
    translatedText: 'Translated text here',
    sourceLang: 'en',
    targetLang: 'de',
  };
};

