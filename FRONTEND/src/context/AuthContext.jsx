import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const STORAGE_KEY = 'dt_user';

export const AuthContext = createContext({
  user: null,
  login: () => {},
  logout: () => {},
  getInitials: () => 'DT'
});

export function computeInitials(name) {
  if (!name || typeof name !== 'string') return 'DT';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.name === 'string' && typeof parsed.email === 'string') {
          return parsed;
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
    return null;
  });

  const login = (userData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } catch {
      // Ignore localStorage write error
    }
    setUser(userData);
  };

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    setUser(null);
  };

  const getInitials = () => {
    return computeInitials(user?.name);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, getInitials }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default AuthContext;

