
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    // Si la carga ha terminado y el usuario no está autenticado, redirigir al login.
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Mientras se verifica la sesión o si el usuario no está autenticado (y la redirección está en curso),
  // se muestra un estado de carga para evitar mostrar contenido protegido.
  if (isLoading || !isAuthenticated) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  // Si la carga ha terminado y el usuario está autenticado, se muestra el contenido protegido.
  return <>{children}</>;
}
