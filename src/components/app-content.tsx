'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import MainLayout from './main-layout';
import { Loader2 } from 'lucide-react';
import { SearchProvider } from '@/context/search-context';

export default function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (isLoading) {
      return; 
    }
    
    // Si no está autenticado y no está en la página de login, redirigir a login.
    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
    
    // Si está autenticado y está en la página de login, redirigir al inicio.
    if (isAuthenticated && pathname === '/login') {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, pathname, router]);


  // Si la sesión se está cargando, mostrar un spinner global.
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Renderizar el layout principal si está autenticado y no en login.
  if (isAuthenticated && pathname !== '/login') {
     return (
      <SearchProvider>
        <MainLayout>{children}</MainLayout>
      </SearchProvider>
     )
  }

  // Renderizar la página de login si no está autenticado.
  if (!isAuthenticated && pathname === '/login') {
    return <>{children}</>;
  }
  
  // Durante el breve momento de la redirección, mostrar un loader
  // para evitar parpadeos de contenido no deseado.
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
