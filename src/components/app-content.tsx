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
    // No hacer nada mientras se carga.
    // Redirigir solo cuando la carga haya finalizado y sepamos el estado de autenticación.
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);


  // Si está cargando, mostrar un spinner global.
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Si no está autenticado y está en la página de login, mostrarla.
  if (!isAuthenticated && pathname === '/login') {
    return <>{children}</>;
  }

  // Si está autenticado, mostrar el layout principal.
  if (isAuthenticated) {
     if (pathname === '/login') {
        // Si está autenticado pero de alguna manera llega al login, lo mandamos al inicio.
        router.push('/');
        return (
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        );
     }
     return <MainLayout>{children}</MainLayout>;
  }
  
  // Para cualquier otro caso (por ejemplo, !isLoading && !isAuthenticated y está en una ruta que no es /login),
  // el useEffect ya habrá iniciado la redirección. Mostramos un loader mientras tanto.
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}