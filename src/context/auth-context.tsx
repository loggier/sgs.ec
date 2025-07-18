'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    const checkUser = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/session');
            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            } else {
                setUser(null);
                // The middleware handles redirection, no need to push here
            }
        } catch (error) {
            console.error("Failed to fetch user session", error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };
    // Only check session if not on the login page to avoid race conditions during login
    if (pathname !== '/login') {
        checkUser();
    } else {
        setIsLoading(false);
    }
  }, [pathname]);

  const login = async (username: string, password: string) => {
    const result = await loginUser({ username, password });
    if (result.success && result.user) {
      setUser(result.user);
      router.push('/');
    } else {
      throw new Error(result.message);
    }
  };

  const logout = async () => {
    const response = await fetch('/api/logout', { method: 'POST' });
    if (response.ok) {
        setUser(null);
        router.push('/login');
    } else {
        console.error('Logout failed');
        // Even if server fails, clear client state and redirect
        setUser(null);
        router.push('/login');
    }
  };
  
  const updateUserContext = (newUser: User) => {
    setUser(newUser);
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
