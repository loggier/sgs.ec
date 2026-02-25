
'use client';

import Header from '@/components/header';
import AppContent from '@/components/app-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HardHat, Wrench } from 'lucide-react';
import Link from 'next/link';

function ReportsHubPage() {
  return (
    <>
      <Header title="Central de Reportes" />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Reportes Disponibles</CardTitle>
            <CardDescription>Seleccione el tipo de reporte que desea generar y analizar.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
             <Link href="/reports/installations" className="block">
                <div className="p-6 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
                    <div className="flex items-center gap-4">
                        <HardHat className="h-8 w-8 text-primary"/>
                        <div>
                            <h3 className="font-semibold text-lg">Reporte de Instalaciones</h3>
                            <p className="text-sm text-muted-foreground">Analizar datos de órdenes de instalación.</p>
                        </div>
                    </div>
                </div>
             </Link>
              <Link href="/reports/work-orders" className="block">
                <div className="p-6 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
                    <div className="flex items-center gap-4">
                        <Wrench className="h-8 w-8 text-primary"/>
                        <div>
                            <h3 className="font-semibold text-lg">Reporte de Órdenes de Soporte</h3>
                            <p className="text-sm text-muted-foreground">Analizar datos de órdenes de soporte técnico.</p>
                        </div>
                    </div>
                </div>
             </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function ReportsPage() {
    return (
        <AppContent>
            <ReportsHubPage />
        </AppContent>
    )
}
