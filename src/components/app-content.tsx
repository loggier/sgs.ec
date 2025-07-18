'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import MainLayout from './main-layout';

export default function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // The middleware protects routes, so if we're not on the login page,
  // we can assume we are authenticated and should show the main layout.
  if (pathname !== '/login') {
    return (
      <MainLayout>
        {children}
      </MainLayout>
    );
  }
  
  // This will render the login page, as it's the only case left.
  return <>{children}</>;
}
