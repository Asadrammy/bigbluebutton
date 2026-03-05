import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { store } from './index';
import config from '@config/environment';
import { setCredentials, clearCredentials } from './authSlice';

// Shared axios client for the app
export const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.apiTimeout,
});

// Attach Authorization from Redux on each request
apiClient.interceptors.request.use((req: AxiosRequestConfig) => {
  const state = store.getState();
  const token = state.auth.accessToken;
  if (token) {
    req.headers = req.headers || {};
    (req.headers as any).Authorization = `Bearer ${token}`;
  }
  return req;
});

// Handle 401 with refresh flow
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

function onRefreshed() {
  pendingQueue.forEach((cb) => cb());
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Enhanced error handling for network errors
    if (!error.response) {
      // Network error - no response from server
      const networkError: any = new Error(error.message || 'Network Error');
      networkError.code = 'NETWORK_ERROR';
      networkError.isNetworkError = true;
      networkError.config = error.config;
      // Log network error details with helpful information
      const apiUrl = config.apiBaseUrl;
      const baseUrl = apiUrl.replace('/api/v1', '');
      console.error('Network error:', {
        message: error.message,
        baseURL: apiUrl,
        url: error.config?.url,
        method: error.config?.method,
        code: error.code,
        troubleshooting: `Backend may not be running. Test: ${baseUrl}/health`,
      });
      return Promise.reject(networkError);
    }

    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const state = store.getState();
      const refreshToken = state.auth.refreshToken;
      if (!refreshToken) {
        store.dispatch(clearCredentials());
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // queue and retry after refresh completes
        return new Promise((resolve, reject) => {
          pendingQueue.push(() => {
            const token = store.getState().auth.accessToken;
            if (token) {
              original.headers = original.headers || {};
              (original.headers as any).Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(original));
          });
        });
      }

      isRefreshing = true;
      try {
        // Use a bare axios to avoid interceptor recursion
        const refreshRes = await axios.post(
          `${config.apiBaseUrl}/auth/refresh`,
          { refresh_token: refreshToken },
          { timeout: config.apiTimeout }
        );
        const { access_token, refresh_token, expires_in } = refreshRes.data || {};
        if (!access_token || !refresh_token) {
          throw new Error('Invalid refresh response');
        }
        store.dispatch(
          setCredentials({ accessToken: access_token, refreshToken: refresh_token })
        );

        // retry original with new token
        const newToken = store.getState().auth.accessToken;
        if (newToken) {
          original.headers = original.headers || {};
          (original.headers as any).Authorization = `Bearer ${newToken}`;
        }
        onRefreshed();
        return apiClient(original);
      } catch (e) {
        store.dispatch(clearCredentials());
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
