/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
import axios, { AxiosInstance } from 'axios';
import config from '@config/environment';
import { store } from '@store/index';
import { setCredentials, clearCredentials } from '@store/authSlice';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  preferred_language: string;
  sign_language: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  preferred_language?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
  expires_in?: number;
}

class AuthService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${config.apiBaseUrl}/auth`,
      timeout: config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Token is injected by shared client for app requests; auth endpoints don't need it here.

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const message = error.response.data?.detail || 'An error occurred';
          throw new Error(message);
        } else if (error.request) {
          throw new Error('Network error. Please check your connection.');
        } else {
          throw new Error('An unexpected error occurred');
        }
      }
    );
  }

  async setAuthToken(token: string, refreshToken: string, expiresIn?: number) {
    // Sync Redux store only; persistence handled by AuthContext
    store.dispatch(setCredentials({ accessToken: token, refreshToken }));
  }

  async clearAuthToken() {
    store.dispatch(clearCredentials());
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/register', data);
    const authData = response.data;

    await this.setAuthToken(
      authData.access_token,
      authData.refresh_token,
      authData.expires_in
    );

    return authData;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/login', credentials);
    const authData = response.data;

    await this.setAuthToken(
      authData.access_token,
      authData.refresh_token,
      authData.expires_in
    );

    return authData;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/logout');
    } finally {
      await this.clearAuthToken();
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await this.api.post('/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.api.post('/reset-password', {
      token,
      new_password: newPassword,
    });
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.api.post('/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  }

  async getCurrentUser(): Promise<AuthUser> {
    const response = await this.api.get<{
      id: number;
      username: string;
      email: string;
      first_name?: string;
      last_name?: string;
      preferred_language: string;
      sign_language: string;
      created_at: string;
    }>('/me');
    
    // Map snake_case to camelCase
    return {
      id: response.data.id,
      username: response.data.username,
      email: response.data.email,
      firstName: response.data.first_name,
      lastName: response.data.last_name,
      preferred_language: response.data.preferred_language,
      sign_language: response.data.sign_language,
      created_at: response.data.created_at,
    };
  }

  async updateProfile(data: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
  }): Promise<AuthUser> {
    const response = await this.api.put<{
      id: number;
      username: string;
      email: string;
      first_name?: string;
      last_name?: string;
      preferred_language: string;
      sign_language: string;
      created_at: string;
    }>('/me', {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      username: data.username,
    });
    
    // Map snake_case to camelCase
    return {
      id: response.data.id,
      username: response.data.username,
      email: response.data.email,
      firstName: response.data.first_name,
      lastName: response.data.last_name,
      preferred_language: response.data.preferred_language,
      sign_language: response.data.sign_language,
      created_at: response.data.created_at,
    };
  }
}

const authService = new AuthService();
export default authService;

