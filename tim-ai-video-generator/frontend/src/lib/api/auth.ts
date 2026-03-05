import { apiRequest } from '@/lib/api/client';
import type { AuthResponse, AuthUser, SpokenLanguage, SignLanguage, UserSettings, TranslatorDefaults } from '@/lib/api/types';

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  preferred_language?: SpokenLanguage;
  sign_language?: SignLanguage;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  preferred_language?: SpokenLanguage;
  sign_language?: SignLanguage;
}

export interface UpdateSettingsPayload {
  preferred_language?: SpokenLanguage;
  sign_language?: SignLanguage;
  video_quality?: 'low' | 'medium' | 'high';
  audio_quality?: 'low' | 'medium' | 'high';
  translator_defaults?: TranslatorDefaults;
}

export function register(payload: RegisterPayload) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export function getCurrentUser(token: string) {
  return apiRequest<AuthUser>('/auth/me', {
    method: 'GET',
    token,
  });
}

export function logout(token: string) {
  return apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
    token,
  });
}

export function forgotPassword(email: string) {
  return apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export function resetPassword(token: string, newPassword: string) {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: {
      token,
      new_password: newPassword,
    },
  });
}

export function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
) {
  return apiRequest<{ message: string }>('/auth/change-password', {
    method: 'POST',
    token,
    body: {
      current_password: currentPassword,
      new_password: newPassword,
    },
  });
}

export function updateProfile(token: string, payload: UpdateProfilePayload) {
  return apiRequest<AuthUser>('/auth/me', {
    method: 'PUT',
    token,
    body: payload,
  });
}

export function getSettings(token: string) {
  return apiRequest<UserSettings>('/auth/settings', {
    method: 'GET',
    token,
  });
}

export function updateSettings(token: string, payload: UpdateSettingsPayload) {
  return apiRequest<UserSettings>('/auth/settings', {
    method: 'PUT',
    token,
    body: payload,
  });
}
