import axios, { AxiosInstance } from 'axios';
import {
  TranslationRequest,
  TranslationResponse,
  SpeechToTextRequest,
  SpeechToTextResponse,
  TextToSpeechRequest,
  TextToSpeechResponse,
  SignToTextRequest,
  SignToTextResponse,
  TextToSignRequest,
  TextToSignResponse,
  ApiError,
} from '@types/index';
import config from '@config/environment';
import { apiClient } from '@store/axiosClient';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    // Use shared client that reads token from Redux and refreshes automatically
    this.client = apiClient;

    // Add response interceptor for error handling (mapping)
    this.client.interceptors.response.use(
      response => response,
      error => {
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'Unknown error occurred',
          code: error.response?.status?.toString() || 'NETWORK_ERROR',
          details: error.response?.data,
        };
        return Promise.reject(apiError);
      },
    );

    // Authorization is handled by Redux-aware axios client interceptors
  }

  // Sign Language to Text
  async signToText(request: SignToTextRequest): Promise<SignToTextResponse> {
    const response = await this.client.post<SignToTextResponse>('/sign-to-text', request);
    return response.data;
  }

  // Speech to Text
  async speechToText(request: SpeechToTextRequest): Promise<SpeechToTextResponse> {
    // Backend expects snake_case and raw base64 (not data URI)
    const backendRequest = {
      audio_data: request.audio_data, // Already in correct format
      language: request.language,
    };
    const response = await this.client.post<SpeechToTextResponse>('/speech-to-text', backendRequest);
    return response.data;
  }

  // Text to Speech
  async textToSpeech(request: TextToSpeechRequest): Promise<TextToSpeechResponse> {
    const backendRequest = {
      text: request.text,
      target_language: request.targetLanguage,
    };
    const response = await this.client.post<TextToSpeechResponse>('/text-to-speech', backendRequest);
    return response.data;
  }

  // Text to Sign Language
  async textToSign(request: TextToSignRequest): Promise<TextToSignResponse> {
    // Backend expects snake_case
    const backendRequest = {
      text: request.text,
      source_language: request.sourceLanguage,
      sign_language: request.signLanguage,
    };
    const response = await this.client.post<any>('/text-to-sign', backendRequest);
    // Map response fields from snake_case to camelCase
    const responseData = response.data;
    return {
      animationData: responseData.animation_data,
      videoUrl: responseData.video_url,
    };
  }

  // Translation
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const response = await this.client.post<TranslationResponse>('/translate', request);
    return response.data;
  }

  // Video Upload
  async uploadVideo(file: File | Blob, fileName: string): Promise<any> {
    const formData = new FormData();

    if (file instanceof File) {
      formData.append('file', file);
    } else {
      formData.append('file', {
        uri: (file as any).uri || '',
        type: 'video/mp4',
        name: fileName,
      } as any);
    }

    const response = await this.client.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Upload video file from URI (React Native)
  async uploadVideoFromUri(uri: string, fileName: string): Promise<any> {
    const formData = new FormData();

    formData.append('file', {
      uri: uri,
      type: 'video/mp4',
      name: fileName,
    } as any);

    const response = await this.client.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Extract frames from video
  async extractVideoFrames(
    fileName: string,
    targetFps?: number,
    maxFrames?: number
  ): Promise<any> {
    const params: any = {};
    if (targetFps) params.target_fps = targetFps;
    if (maxFrames) params.max_frames = maxFrames;

    const response = await this.client.post(`/videos/${fileName}/extract-frames`, null, {
      params,
    });
    return response.data;
  }

  // Upload video and process with output language (new endpoint)
  async uploadAndProcessVideo(
    videoUri: string,
    outputLanguage: string,
    fileName?: string
  ): Promise<SignToTextResponse> {
    const formData = new FormData();

    formData.append('file', {
      uri: videoUri,
      type: 'video/mp4',
      name: fileName || `recorded_sign_${Date.now()}.mp4`,
    } as any);

    formData.append('output_language', outputLanguage);

    const response = await this.client.post<SignToTextResponse>(
      '/videos/upload-and-process',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  // Upload audio file (base64)
  async uploadAudio(
    audioData: string, // base64 encoded audio (with or without data URI prefix)
    fileExtension: string = '.m4a'
  ): Promise<any> {
    // Extract base64 from data URI if present
    let base64Audio = audioData;
    if (audioData.includes(';base64,')) {
      base64Audio = audioData.split(';base64,')[1];
    } else if (audioData.startsWith('data:')) {
      base64Audio = audioData.split(',')[1] || audioData;
    }

    const formData = new FormData();
    formData.append('audio_data', base64Audio);
    formData.append('file_extension', fileExtension);

    const response = await this.client.post('/audio/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Backend Health Check
  async checkBackendHealth(): Promise<{ status: string; timestamp?: number; version?: string }> {
    try {
      // Try the v1 health endpoint first
      const response = await this.client.get('/health', {
        timeout: 5000, // 5 second timeout for health check
      });
      return response.data;
    } catch (error: any) {
      // If v1 endpoint fails, try root health endpoint
      try {
        const baseUrl = this.client.defaults.baseURL || config.apiBaseUrl;
        // Remove /api/v1 from base URL to get root
        const rootUrl = baseUrl.replace('/api/v1', '');
        const response = await axios.get(`${rootUrl}/health`, {
          timeout: 5000,
        });
        return response.data;
      } catch (rootError: any) {
        throw new Error('Backend is not reachable');
      }
    }
  }

  updateBaseURL(url: string) {
    this.client.defaults.baseURL = url;
  }
}

export default new ApiService();

