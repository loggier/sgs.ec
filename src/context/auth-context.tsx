
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, updateProfile } from '@/lib/user-actions';
import type { User, ProfileFormInput } from '@/lib/user-schema';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = React.useState(false); 
  const router = useRouter();

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
        const result = await loginUser({ username, password });
        if (result.success && result.user) {
            setUser(result.user);
            router.push('/');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        throw error;
    } finally {
        setIsLoading(false);
    }
  };

  const logout = async () => {
    const response = await fetch('/api/logout', { method: 'POST' });
    if (response.ok) {
        setUser(null);
        router.push('/login');
    } else {
        console.error('Logout failed');
        setUser(null);
        router.push('/login');
    }
  };
  
  const updateUserContext = (newUser: User) => {
    setUser(currentUser => currentUser ? { ...currentUser, ...newUser } : newUser);
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
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
