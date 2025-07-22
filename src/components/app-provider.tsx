
'use client';

import { AuthProvider } from '@/context/auth-context';
import { SearchProvider } from '@/context/search-context';
import { Toaster } from '@/components/ui/toaster';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SearchProvider>
        {children}
        <Toaster />
      </SearchProvider>
    </AuthProvider>
  );
}
