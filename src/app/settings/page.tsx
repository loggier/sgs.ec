
'use client';

import * as React from 'react';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WoxSettingsForm from '@/components/wox-settings-form';

function SettingsPageContent() {
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
