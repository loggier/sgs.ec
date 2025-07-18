'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import MainLayout from './main-layout';

export default function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="text-lg font-semibold">Cargando...</div>
        </div>
    );
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }
  
  // The middleware handles redirection, so we just need to ensure
  // we don't render the layout if the user is not authenticated.
  if (!isAuthenticated) {
     return null;
  }
  
  return (
      <MainLayout>{children}</MainLayout>
  );
}
