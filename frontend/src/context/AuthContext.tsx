import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.ts';
import { User, AuthResponse } from '../types/auth.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('brightloop_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('brightloop_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('brightloop_token');
      if (savedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('brightloop_user', JSON.stringify(res.data.user));
        } catch {
          // Token invalid or expired
          logout();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;

    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('brightloop_token', receivedToken);
    localStorage.setItem('brightloop_user', JSON.stringify(receivedUser));

    return receivedUser;
  };

  const signup = async (name: string, email: string, password: string): Promise<User> => {
    const res = await api.post<AuthResponse>('/auth/signup', { name, email, password });
    const { token: receivedToken, user: receivedUser } = res.data;

    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('brightloop_token', receivedToken);
    localStorage.setItem('brightloop_user', JSON.stringify(receivedUser));

    return receivedUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('brightloop_token');
    localStorage.removeItem('brightloop_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        signup,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

