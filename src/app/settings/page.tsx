
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WoxSettingsForm from '@/components/wox-settings-form';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

function SettingsPageContent() {
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
                    Solo los usuarios con el rol de "Master" pueden acceder a la configuración.
                </AlertDescription>
            </Alert>
        </>
    )
  }

  return (
    <>
      <Header title="Configuración" />
      <div className="space-y-6">
        <Tabs defaultValue="wox" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="wox">Integración WOX</TabsTrigger>
            <TabsTrigger value="qyvoo">Integración Qyvoo</TabsTrigger>
          </TabsList>
          <TabsContent value="wox">
            <Card>
                <CardHeader>
                    <CardTitle>Configuración de WOX</CardTitle>
                    <CardDescription>
                        Configure los detalles para conectar con el servidor de GPS de WOX.
                    </CardDescription>
                </CardHeader>
                <WoxSettingsForm />
            </Card>
          </TabsContent>
          <TabsContent value="qyvoo">
            <Card>
                <CardHeader>
                    <CardTitle>Configuración de Qyvoo</CardTitle>
                    <CardDescription>
                        Configure los detalles para la integración de notificaciones con Qyvoo (Próximamente).
                    </CardDescription>
                </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default function SettingsPage() {
    return (
        <AppContent>
            <SettingsPageContent />
        </AppContent>
    )
}
