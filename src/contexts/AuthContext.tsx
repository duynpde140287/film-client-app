import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ISession, IUser } from '../interfaces';
import { getSession, saveSession } from '../services/api.service';
import { login as apiLogin, logout as apiLogout } from '../services/auth.service';
import { isActiveUser } from '../constants/boolean';

interface AuthContextType {
  session: ISession | null;
  user: IUser | null;
  isAuthenticated: boolean;
  isActive: boolean;
  login: (username: string, pass: string) => Promise<ISession>;
  logout: () => Promise<void>;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAuthenticated: false,
  isActive: false,
  login: async () => {
    throw new Error('Not implemented');
  },
  logout: async () => {},
  refreshSession: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ISession | null>(() => getSession());

  const refreshSession = () => {
    setSession(getSession());
  };

  useEffect(() => {
    const handleSessionChange = () => {
      setSession(getSession());
    };
    window.addEventListener('sessionchange', handleSessionChange);
    return () => window.removeEventListener('sessionchange', handleSessionChange);
  }, []);

  const login = async (username: string, pass: string) => {
    const s = await apiLogin(username, pass);
    setSession(s);
    return s;
  };

  const logout = async () => {
    await apiLogout();
    setSession(null);
  };

  const user = session?.user || null;
  const isAuthenticated = Boolean(session?.token);
  const isActive = isActiveUser(user);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isAuthenticated,
        isActive,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);

