import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError, getApiErrorMessage } from "../lib/apiClient";
import {
  fetchCurrentUser,
  loginWithPassword,
  logoutCurrentSession,
  registerAccount,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from "../lib/authApi";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<AuthUser | null>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMe = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetchCurrentUser(signal);
      setUser(response.user);
      setError(null);
      return response.user;
    } catch (caught) {
      if (signal?.aborted) return null;

      setUser(null);
      if (!(caught instanceof ApiError && caught.status === 401)) {
        setError(getApiErrorMessage(caught));
      }
      return null;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshMe(controller.signal);
    return () => controller.abort();
  }, [refreshMe]);

  const login = useCallback(async (input: LoginInput) => {
    try {
      const response = await loginWithPassword(input);
      setUser(response.user);
      setError(null);
      return response.user;
    } catch (caught) {
      const message = getApiErrorMessage(caught);
      setError(message);
      throw caught;
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    try {
      const response = await registerAccount(input);
      setUser(response.user);
      setError(null);
      return response.user;
    } catch (caught) {
      const message = getApiErrorMessage(caught);
      setError(message);
      throw caught;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutCurrentSession();
      setError(null);
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setUser(null);
    }
  }, []);

  const clearAuthError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      login,
      register,
      logout,
      refreshMe: () => refreshMe(),
      clearAuthError,
    }),
    [clearAuthError, error, loading, login, logout, refreshMe, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
