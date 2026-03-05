import { apiRequest } from '@/lib/api/client';
import type { HistoryStatsResponse, TranslationHistoryListResponse } from '@/lib/api/types';

export type HistoryFilters = {
  page?: number;
  per_page?: number;
  translation_type?: 'text' | 'speech' | 'sign' | '';
  language?: string;
};

export type SaveHistoryPayload = {
  source_text: string;
  target_text: string;
  source_language: string;
  target_language: string;
  translation_type: 'text' | 'speech' | 'sign';
  confidence?: number;
  processing_time?: number;
};

export function fetchHistory(token: string, filters: HistoryFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.per_page) params.set('per_page', String(filters.per_page));
  if (filters.translation_type) params.set('translation_type', filters.translation_type);
  if (filters.language) params.set('language', filters.language);

  const query = params.toString();

  return apiRequest<TranslationHistoryListResponse>(`/history/list${query ? `?${query}` : ''}`, {
    method: 'GET',
    token,
  });
}

export function deleteHistoryItem(token: string, id: number) {
  return apiRequest<void>(`/history/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function clearHistory(token: string) {
  return apiRequest<void>('/history/clear-all', {
    method: 'DELETE',
    token,
  });
}

export function saveHistory(token: string, payload: SaveHistoryPayload) {
  return apiRequest<void>('/history/save', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function fetchHistoryStats(token: string) {
  return apiRequest<HistoryStatsResponse>('/history/stats/overview', {
    method: 'GET',
    token,
  });
}
