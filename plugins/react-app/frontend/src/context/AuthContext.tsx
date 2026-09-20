import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  UserLoginProfile,
  LoginPayload,
  apiLogin,
  apiLogout,
  checkAuth as fetchCheckAuth
} from '../services/api';

interface AuthContextType {
  user: UserLoginProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserLoginProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetchCheckAuth();
      if (res.authenticated && res.user) {
        setUser(res.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (payload: LoginPayload): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiLogin(payload);
      if (res.authenticated && res.user) {
        setUser(res.user);
        setIsAuthenticated(true);
        return true;
      }
      setError(res.message || 'Giriş yapılamadı.');
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Giriş başarısız oldu.';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiLogout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        refreshSession,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
