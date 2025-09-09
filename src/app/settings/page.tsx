
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PgpsSettingsForm from '@/components/pgps-settings-form';
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
    if (!isLoading && user?.role && !['master', 'manager'].includes(user.role)) {
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

  if (!['master', 'manager'].includes(user.role)) {
    return (
        <>
            <Header title="Acceso Denegado" />
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No tienes permiso</AlertTitle>
                <AlertDescription>
                    Solo los usuarios con el rol de "Master" o "Manager" pueden acceder a la configuración.
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
                {user.role === 'master' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Integración P. GPS (Global)</CardTitle>
                        <CardDescription>
                            Configure los detalles para conectar con el servidor de P. GPS. Esta configuración es global para toda la aplicación.
                        </CardDescription>
                    </CardHeader>
                    <PgpsSettingsForm />
                </Card>
                )}
                 <Card>
                    <CardHeader>
                        <CardTitle>Integración QV (Personal)</CardTitle>
                        <CardDescription>
                            Configure sus credenciales para la integración de notificaciones con QV.
                            Estas credenciales se usarán para enviar mensajes a sus clientes.
                        </CardDescription>
                    </CardHeader>
                    <QyvooSettingsForm />
                </Card>
            </div>
          </TabsContent>
          <TabsContent value="templates">
             <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Plantillas de Mensajes Personales</CardTitle>
                        <CardDescription>
                           Gestione sus plantillas personales para las notificaciones automáticas y manuales enviadas a través de QV. Si no crea una plantilla personal, se usará la plantilla global por defecto.
                           <Link href="/settings/templates" className="text-primary hover:underline ml-2">
                                Ir al gestor de plantillas personales
                           </Link>
                        </CardDescription>
                    </CardHeader>
                </Card>
                {user.role === 'master' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Plantillas de Mensajes Globales</CardTitle>
                            <CardDescription>
                               Edite las plantillas de mensajes que se usarán por defecto en toda la aplicación para los usuarios que no hayan configurado las suyas.
                               <Link href="/settings/templates/global" className="text-primary hover:underline ml-2">
                                    Ir al gestor de plantillas globales
                               </Link>
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}
             </div>
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
