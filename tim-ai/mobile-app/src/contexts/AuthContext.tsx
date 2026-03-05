/**
 * Authentication Context
 * Manages user authentication state across the app
 */
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService, { AuthUser, LoginCredentials, RegisterData } from '@services/authService';
import { store, useAppSelector } from '@store/index';
import { setCredentials as setReduxCredentials, clearCredentials as clearReduxCredentials } from '@store/authSlice';

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUser: (userData: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';
const USER_KEY = '@auth_user';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const reduxUser = useAppSelector((s) => s.auth.user);
  const reduxAccessToken = useAppSelector((s) => s.auth.accessToken);
  const [user, setUser] = useState<AuthUser | null>(reduxUser || null);
  const [accessToken, setAccessToken] = useState<string | null>(reduxAccessToken || null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on mount
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const [token, refreshToken, userData] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setAccessToken(token);
        setUser(parsedUser);
        // Sync Redux early
        store.dispatch(
          setReduxCredentials({ accessToken: token, refreshToken: refreshToken || '', user: parsedUser })
        );
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuthData = async (token: string, refreshToken: string, userData: AuthUser) => {
    try {
      await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [REFRESH_TOKEN_KEY, refreshToken],
        [USER_KEY, JSON.stringify(userData)],
      ]);
      setAccessToken(token);
      setUser(userData);
      // Sync Redux immediately
      store.dispatch(setReduxCredentials({ accessToken: token, refreshToken, user: userData }));
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  };

  const clearAuthData = async () => {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
      setAccessToken(null);
      setUser(null);
      authService.setAuthToken('', '');
      // Clear Redux
      store.dispatch(clearReduxCredentials());
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);
      await saveAuthData(response.access_token, response.refresh_token, response.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await authService.register(data);
      await saveAuthData(response.access_token, response.refresh_token, response.user);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {}
    await clearAuthData();
  };

  const forgotPassword = async (email: string) => {
    await authService.forgotPassword(email);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword);
  };

  const updateUser = (userData: AuthUser) => {
    setUser(userData);
    // Update storage
    AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)).catch(console.error);
    // Sync Redux
    store.dispatch(setReduxCredentials({ 
      accessToken: accessToken || '', 
      refreshToken: '', 
      user: userData 
    }));
  };

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!accessToken,
    login,
    register,
    logout,
    forgotPassword,
    changePassword,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

