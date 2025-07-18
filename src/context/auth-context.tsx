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
  logout: () => void;
  updateUserContext: (newUser: User) => void;
  updateUser: (userId: string, data: ProfileFormInput) => Promise<{success: boolean; message: string; user?: User;}>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const result = await loginUser({ username, password });
    if (result.success && result.user) {
      setUser(result.user);
      localStorage.setItem('user', JSON.stringify(result.user));
      router.push('/');
    } else {
      throw new Error(result.message);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    router.push('/login');
  };
  
  const updateUserContext = (newUser: User) => {
      setUser(currentUser => {
        const updatedUser = currentUser ? { ...currentUser, ...newUser } : newUser;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      });
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
