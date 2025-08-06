
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
import QyvooSettingsForm from '@/components/qyvoo-settings-form';
import Link from 'next/link';

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
        <Tabs defaultValue="integrations" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="integrations">Integraciones</TabsTrigger>
            <TabsTrigger value="templates">Plantillas de Mensajes</TabsTrigger>
          </TabsList>
          <TabsContent value="integrations">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Integración WOX</CardTitle>
                        <CardDescription>
                            Configure los detalles para conectar con el servidor de GPS de WOX.
                        </CardDescription>
                    </CardHeader>
                    <WoxSettingsForm />
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Integración Qyvoo</CardTitle>
                        <CardDescription>
                            Configure los detalles para la integración de notificaciones con Qyvoo.
                        </CardDescription>
                    </CardHeader>
                    <QyvooSettingsForm />
                </Card>
            </div>
          </TabsContent>
          <TabsContent value="templates">
            <Card>
                <CardHeader>
                    <CardTitle>Plantillas de Mensajes de WhatsApp</CardTitle>
                    <CardDescription>
                       Gestione las plantillas para las notificaciones automáticas y manuales enviadas a través de Qyvoo.
                       <Link href="/settings/templates" className="text-primary hover:underline ml-2">
                            Ir al gestor de plantillas
                       </Link>
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
