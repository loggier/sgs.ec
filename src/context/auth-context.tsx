
'use client';

import * as React from 'react';
import { loginUser, updateProfile } from '@/lib/user-actions';
import type { User, ProfileFormInput } from '@/lib/user-schema';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserContext: (newUser: User) => void;
  updateUser: (userId: string, data: ProfileFormInput) => Promise<{success: boolean; message: string; user?: User;}>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
    children: React.ReactNode;
    initialUser: User | null;
};

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = React.useState<User | null>(initialUser);

  const login = async (username: string, password: string) => {
    try {
        const result = await loginUser({ username, password });
        if (result.success && result.user) {
            // Force a full page reload to ensure the new cookie is read by the server layout
            // and the entire app state is reset correctly.
            window.location.href = '/';
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        throw error;
    }
  };

  const logout = async () => {
    const response = await fetch('/api/logout', { method: 'POST' });
    if (response.ok) {
        setUser(null);
        window.location.href = '/login';
    } else {
        console.error('Logout failed');
        // Still force redirect even if API call fails
        setUser(null);
        window.location.href = '/login';
    }
  };
  
  const updateUserContext = (newUser: User) => {
    setUser(currentUser => currentUser ? { ...currentUser, ...newUser } : newUser);
  }

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    updateUserContext,
    updateUser: updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
