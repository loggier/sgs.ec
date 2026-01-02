
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import PgpsSettingsForm from '@/components/pgps-settings-form';
import { useAuth } from '@/context/auth-context';
import { Loader2, Database, AlertTriangle, Map, Globe } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import NotificationSettingsForm from '@/components/notification-settings-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
            <TabsTrigger value="templates">Plantillas</TabsTrigger>
            {user.role === 'master' && <TabsTrigger value="catalogs">Catálogos</TabsTrigger>}
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
                        <CardTitle>URL de Notificaciones (Personal)</CardTitle>
                        <CardDescription>
                            Configure su URL personal para el envío de notificaciones.
                            Esta URL se usará para enviar mensajes a sus clientes. Los usuarios 'Analistas' usarán la URL del 'Manager' que los creó.
                        </CardDescription>
                    </CardHeader>
                    <NotificationSettingsForm />
                </Card>
            </div>
          </TabsContent>
          <TabsContent value="templates">
             <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Plantillas de Mensajes Personales</CardTitle>
                        <CardDescription>
                           Gestione sus plantillas personales para las notificaciones automáticas y manuales. Si no crea una plantilla personal, se usará la plantilla global por defecto.
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
           <TabsContent value="catalogs">
             <div className="space-y-6">
                {user.role === 'master' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Catálogos del Sistema</CardTitle>
                            <CardDescription>
                               Gestione los datos maestros utilizados en todo el sistema, como países y ciudades.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                           <Link href="/settings/countries" className="block">
                                <div className="p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Globe className="h-6 w-6 text-primary"/>
                                        <div>
                                            <h3 className="font-semibold">Países</h3>
                                            <p className="text-sm text-muted-foreground">Administrar los países disponibles.</p>
                                        </div>
                                    </div>
                                </div>
                           </Link>
                            <Link href="/settings/cities" className="block">
                                <div className="p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Map className="h-6 w-6 text-primary"/>
                                        <div>
                                            <h3 className="font-semibold">Ciudades</h3>
                                            <p className="text-sm text-muted-foreground">Administrar ciudades por país.</p>
                                        </div>
                                    </div>
                                </div>
                           </Link>
                        </CardContent>
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
