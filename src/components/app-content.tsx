'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import MainLayout from './main-layout';

export default function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="text-lg font-semibold">Cargando...</div>
        </div>
    );
  }

  if (isAuthenticated && pathname !== '/login') {
    return (
      <MainLayout>
        {children}
      </MainLayout>
    );
  }
  
  return <>{children}</>;
}