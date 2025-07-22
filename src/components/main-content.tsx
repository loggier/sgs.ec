
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import MainLayout from './main-layout';
import { Loader2 } from 'lucide-react';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (isLoading) {
      return;
    }
    
    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
    
    if (isAuthenticated && pathname === '/login') {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && pathname !== '/login') {
     return (
        <MainLayout>{children}</MainLayout>
     )
  }

  if (!isAuthenticated && pathname === '/login') {
    return <>{children}</>;
  }
  
  if (pathname === '/login' || !isAuthenticated) {
     return <>{children}</>;
  }
  
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
