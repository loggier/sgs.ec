
'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import MainLayout from './main-layout';

export default function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useAuth();

  const getPageTitle = () => {
    if (pathname === '/') return 'Clientes';
    if (pathname.startsWith('/clients/') && pathname.endsWith('/units')) {
      return 'Unidades del Cliente';
    }
    if (pathname === '/units') return 'Todas las Unidades';
    if (pathname === '/users') return 'Usuarios';
    return 'SGC';
  };

  const showBackButton = pathname.startsWith('/clients/') && pathname.endsWith('/units');

  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="text-lg font-semibold">Cargando...</div>
        </div>
    );
  }

  // Si está autenticado y no es la página de login, muestra el layout principal
  if (isAuthenticated && pathname !== '/login') {
    return (
      <MainLayout 
        title={getPageTitle()}
        showBackButton={showBackButton}
        backButtonHref="/"
      >
        {children}
      </MainLayout>
    );
  }
  
  // Para la página de login o si no está autenticado, muestra solo el contenido
  return <>{children}</>;
}
