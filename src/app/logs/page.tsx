
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import { useAuth } from '@/context/auth-context';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import LogList from '@/components/log-list';

function LogsPageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && user?.role !== 'master') {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user.role !== 'master') {
    return (
        <>
            <Header title="Acceso Denegado" />
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No tienes permiso</AlertTitle>
                <AlertDescription>
                    Solo los usuarios con el rol de "Master" pueden acceder a esta sección.
                </AlertDescription>
            </Alert>
        </>
    )
  }

  return (
    <>
      <Header title="Logs de Notificaciones" />
      <LogList />
    </>
  );
}

export default function LogsPage() {
    return (
        <AppContent>
            <LogsPageContent />
        </AppContent>
    )
}
