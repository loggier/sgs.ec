
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
      return; // No hacer nada mientras se carga la sesión
    }

    // Si la carga ha finalizado y el usuario no está autenticado,
    // y no está en la página de login, redirigir a login.
    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
    
    // Si la carga ha finalizado y el usuario SÍ está autenticado,
    // pero está en la página de login, redirigir al inicio.
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

  // Si está autenticado y NO está en la página de login, mostrar el layout principal.
  if (isAuthenticated && pathname !== '/login') {
     return <MainLayout>{children}</MainLayout>;
  }

  // Si NO está autenticado y está en la página de login, mostrarla.
  if (!isAuthenticated && pathname === '/login') {
    return <>{children}</>;
  }
  
  // Para cualquier otro caso (como durante la redirección),
  // mostramos un loader para evitar parpadeos.
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
