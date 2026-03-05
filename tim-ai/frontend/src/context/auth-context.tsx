"use client";

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { AuthResponse, AuthUser } from '@/lib/api/types';
import { login as loginRequest, register as registerRequest } from '@/lib/api/auth';

type AuthContextState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: Parameters<typeof registerRequest>[0]) => Promise<void>;
  logout: () => void;
  setUserData: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextState | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'timai_access_token';
const REFRESH_TOKEN_KEY = 'timai_refresh_token';
const USER_KEY = 'timai_user';

function readPersistedState(): {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
} {
  if (typeof window === 'undefined') {
    return { accessToken: null, refreshToken: null, user: null };
  }

  try {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);

    return {
      accessToken,
      refreshToken,
      user: userRaw ? (JSON.parse(userRaw) as AuthUser) : null,
    };
  } catch (error) {
    console.warn('Failed to read auth state', error);
    return { accessToken: null, refreshToken: null, user: null };
  }
}

function persistState(state: {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (state.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, state.accessToken);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }

    if (state.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, state.refreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }

    if (state.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (error) {
    console.warn('Failed to persist auth state', error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { accessToken: initialAccessToken, refreshToken: initialRefreshToken, user: initialUser } =
    readPersistedState();

  const [accessToken, setAccessToken] = useState<string | null>(initialAccessToken);
  const [refreshToken, setRefreshToken] = useState<string | null>(initialRefreshToken);
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);

  const updateState = useCallback((next: { accessToken: string | null; refreshToken: string | null; user: AuthUser | null }) => {
    setAccessToken(next.accessToken);
    setRefreshToken(next.refreshToken);
    setUser(next.user);
    persistState(next);
  }, []);

  const handleAuthSuccess = useCallback(
    (response: AuthResponse) => {
      updateState({ accessToken: response.access_token, refreshToken: response.refresh_token, user: response.user });
    },
    [updateState],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const response = await loginRequest({ email, password });
        handleAuthSuccess(response);
      } finally {
        setIsLoading(false);
      }
    },
    [handleAuthSuccess],
  );

  const register = useCallback(
    async (payload: Parameters<typeof registerRequest>[0]) => {
      setIsLoading(true);
      try {
        const response = await registerRequest(payload);
        handleAuthSuccess(response);
      } finally {
        setIsLoading(false);
      }
    },
    [handleAuthSuccess],
  );

  const logout = useCallback(() => {
    updateState({ accessToken: null, refreshToken: null, user: null });
  }, [updateState]);

  const setUserData = useCallback(
    (nextUser: AuthUser) => {
      updateState({ accessToken, refreshToken, user: nextUser });
    },
    [accessToken, refreshToken, updateState],
  );

  const value = useMemo<AuthContextState>(
    () => ({ user, accessToken, refreshToken, isLoading, login, register, logout, setUserData }),
    [user, accessToken, refreshToken, isLoading, login, register, logout, setUserData],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
