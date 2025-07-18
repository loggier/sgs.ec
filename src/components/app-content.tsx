
'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import ProtectedRoute from './protected-route';
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
  
  if (!isAuthenticated) {
    return null; // The ProtectedRoute will handle the redirect
  }
  
  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}
