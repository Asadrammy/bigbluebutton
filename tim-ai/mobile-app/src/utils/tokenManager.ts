/**
 * Token Manager
 * Handles JWT token storage, refresh, and expiration
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import config from '@config/environment';

const TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';
const TOKEN_EXPIRY_KEY = '@token_expiry';

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class TokenManager {
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  /**
   * Store tokens securely
   */
  async storeTokens(accessToken: string, refreshToken: string, expiresIn: number = 3600): Promise<void> {
    const expiresAt = Date.now() + expiresIn * 1000;
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, accessToken),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
      AsyncStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString()),
    ]);
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Check if token is expired or about to expire (within 5 minutes)
   */
  async isTokenExpired(): Promise<boolean> {
    const expiryStr = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryStr) return true;

    const expiryTime = parseInt(expiryStr, 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return now >= expiryTime - fiveMinutes;
  }

  /**
   * Clear all tokens
   */
  async clearTokens(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(TOKEN_EXPIRY_KEY),
    ]);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    if (this.isRefreshing) {
      // If already refreshing, wait for it to complete
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = await this.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(
        `${config.apiBaseUrl}/auth/refresh`,
        { refresh_token: refreshToken },
        { timeout: config.apiTimeout }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      await this.storeTokens(access_token, refresh_token, expires_in);

      // Resolve all pending requests
      this.processQueue(null, access_token);

      return access_token;
    } catch (error) {
      // Reject all pending requests
      this.processQueue(error, null);
      await this.clearTokens();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Process queued requests after token refresh
   */
  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(promise => {
      if (error) {
        promise.reject(error);
      } else if (token) {
        promise.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  /**
   * Setup interceptors for Axios instance
   */
  setupInterceptors(axiosInstance: AxiosInstance): void {
    // Request interceptor - Add auth token
    axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        let token = await this.getAccessToken();

        // Check if token is expired and refresh if needed
        const isExpired = await this.isTokenExpired();
        if (isExpired && token) {
          try {
            token = await this.refreshAccessToken();
          } catch (error) {
            // If refresh fails, proceed with existing token
            console.warn('Token refresh failed:', error);
          }
        }

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle 401 errors
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // If 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }

            return axiosInstance(originalRequest);
          } catch (refreshError) {
            // Refresh failed - user needs to log in again
            await this.clearTokens();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();
export default tokenManager;

