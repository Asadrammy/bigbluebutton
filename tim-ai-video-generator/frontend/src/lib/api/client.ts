import type { ApiError } from '@/lib/api/types';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

export const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
};

type RequestOptions = Omit<RequestInit, 'body'> & {
  token?: string;
  body?: unknown;
};

export async function apiRequest<T>(
  endpoint: string,
  { token, headers, body, ...init }: RequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    ...init,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let details: unknown;

    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }

    const apiError: ApiError = {
      message:
        (details as { detail?: string; message?: string })?.detail ||
        (details as { detail?: string; message?: string })?.message ||
        `API request failed with status ${response.status}`,
      code: String(response.status),
      details,
    };

    throw apiError;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
