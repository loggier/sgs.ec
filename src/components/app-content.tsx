
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import MainLayout from './main-layout';
import { Loader2 } from 'lucide-react';

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
        <MainLayout>
            <div className="flex flex-col flex-1 p-4 md:p-6 h-full">
                {children}
            </div>
        </MainLayout>
     )
  }

  // Renderizar la página de login si no está autenticado.
  if (!isAuthenticated && pathname === '/login') {
    return <>{children}</>;
  }
  
  // Durante el breve momento de la redirección, mostrar un loader
  // para evitar parpadeos de contenido no deseado.
  // También maneja el caso de la página 404
  if (pathname === '/login' || !isAuthenticated) {
     return <>{children}</>;
  }
  
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
