
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, logoutUser, updateProfile } from '@/lib/user-actions';
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
    // Intenta cargar el usuario desde localStorage al iniciar la app
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Fallo al leer usuario de localStorage", error);
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const result = await loginUser({ username, password });
    if (result.success && result.user) {
      setUser(result.user);
      // Guardar usuario en localStorage para persistir la sesión
      localStorage.setItem('user', JSON.stringify(result.user));
      router.push('/');
    } else {
      throw new Error(result.message);
    }
  };

  const logout = async () => {
    setUser(null);
    // Limpiar localStorage al cerrar sesión
    localStorage.removeItem('user');
    await logoutUser(); // Llama a la acción del servidor para limpiar la cookie por si acaso
    router.push('/login');
  };
  
  const updateUserContext = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };
  
  // La función de actualizar perfil ahora también debe actualizar localStorage
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
