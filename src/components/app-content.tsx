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

  // The middleware handles all redirection logic.
  // This component just decides what to render based on the final auth state.
  if (isAuthenticated && pathname !== '/login') {
    return <MainLayout>{children}</MainLayout>;
  }
  
  // For the login page or if not authenticated
  return <>{children}</>;
}
