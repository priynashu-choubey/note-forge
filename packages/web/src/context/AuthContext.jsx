import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (api.accessToken) {
        try {
          const data = await api.getMe();
          setUser(data.user);
        } catch {
          api.clearTokens();
        }
      }
      setLoading(false);
    };

    api.onAuthError = () => {
      setUser(null);
      setShowAuth(true);
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    api.setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    setShowAuth(false);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const data = await api.register(email, password, name);
    api.setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    setShowAuth(false);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore errors on logout
    }
    setUser(null);
    setShowAuth(true);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      showAuth,
      setShowAuth,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
