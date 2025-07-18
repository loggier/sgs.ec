
'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import MainLayout from './main-layout';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from './protected-route';


export default function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }
  
  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}
