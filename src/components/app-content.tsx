'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import MainLayout from './main-layout';

export default function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading, isAuthenticated, user } = useAuth();

  const getPageTitle = () => {
    if (pathname === '/') return 'Clientes';
    if (pathname.startsWith('/clients/') && pathname.endsWith('/units')) {
      // This part is tricky without fetching client name here. 
      // A more robust solution might involve a separate context for page titles.
      // For now, we'll keep it generic.
      return 'Unidades del Cliente';
    }
    if (pathname === '/units') return 'Todas las Unidades';
    if (pathname === '/users') return 'Usuarios';
    return 'SGC';
  };

  const showBackButton = pathname.startsWith('/clients/') && pathname.endsWith('/units');

  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="text-lg font-semibold">Cargando...</div>
        </div>
    );
  }

  if (isAuthenticated && user && pathname !== '/login') {
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
  
  // For the login page or if not authenticated
  return <>{children}</>;
}
