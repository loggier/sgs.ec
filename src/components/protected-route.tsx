
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect only when loading is complete and user is not authenticated.
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // While loading, or if not authenticated, don't render children.
  // The redirect will happen in the useEffect.
  if (isLoading || !isAuthenticated) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="text-lg font-semibold">Verificando acceso...</div>
        </div>
    );
  }

  // If authenticated, render the protected content.
  return <>{children}</>;
}
