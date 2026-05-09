import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, refreshAccessToken } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to refresh token on mount
    refreshAccessToken().then(success => {
      if (success) {
        // Token refreshed, but we need user info
        // For now, we'll set loading to false
        // In a real app, the refresh endpoint should return user info
      }
      setLoading(false);
    });
  }, []);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
