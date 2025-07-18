'use client';

import * as React from 'react';
import type { User, ProfileFormInput } from '@/lib/user-schema';
import { updateProfile } from '@/lib/user-actions';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string; user?: User; }>;
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
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchUser() {
      // If we have an initial user from server, no need to fetch unless we want to revalidate
      if (initialUser) {
        setUser(initialUser);
        setIsLoading(false);
        return;
      }
      
      // If no initial user, try to fetch from API
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [initialUser]);


  const login = async (username: string, password: string) => {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error de inicio de sesión');
        }
        
        // Force a full page reload to ensure the new cookie is read
        // by the server layout and the entire app state is reset correctly.
        window.location.href = '/';
        return { success: true, message: "Inicio de sesión exitoso", user: data.user };

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return { success: false, message };
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
