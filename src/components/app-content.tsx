
'use client';

import { usePathname } from 'next/navigation';
import MainLayout from './main-layout';

export default function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The middleware protects routes. If we are not on the login page,
  // it means we are authenticated and should show the main layout.
  if (pathname !== '/login') {
    return (
      <MainLayout>
        {children}
      </MainLayout>
    );
  }
  
  // This will render the login page itself, as it's the only other case.
  return <>{children}</>;
}
