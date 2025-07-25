
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, logoutUser, updateProfile, getCurrentUser as getCurrentUserFromServer } from '@/lib/user-actions';
import type { User, ProfileFormInput } from '@/lib/user-schema';
import { Loader2 } from 'lucide-react';

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
    async function verifySession() {
      try {
        const serverUser = await getCurrentUserFromServer();
        if (serverUser) {
          setUser(serverUser);
          localStorage.setItem('user', JSON.stringify(serverUser));
        } else {
          setUser(null);
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error("Fallo al verificar la sesión con el servidor", error);
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    }
    verifySession();
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

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('user');
    await logoutUser();
    router.push('/login');
  };
  
  const updateUserContext = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };
  
  const handleUpdateUser = async (userId: string, data: ProfileFormInput) => {
    const result = await updateProfile(userId, data);
    if (result.success && result.user) {
        updateUserContext(result.user);
    }
    return result;
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUserContext,
    updateUser: handleUpdateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
