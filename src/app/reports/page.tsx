
'use client';

import * as React from 'react';
import { BarChart } from 'lucide-react';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

function ReportsPageContent() {
  return (
    <>
      <Header title="Reportes y Estadísticas" />
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Reportes</CardTitle>
                <CardDescription>
                    Esta sección mostrará informes y estadísticas sobre las órdenes de trabajo e instalación.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <BarChart className="h-16 w-16 text-muted-foreground" />
                    <p className="mt-4 text-lg font-semibold text-muted-foreground">
                        Próximamente: Estadísticas de rendimiento
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Aquí podrá ver análisis por técnico, tipo de trabajo y más.
                    </p>
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}


export default function ReportsPage() {
    return (
        <AppContent>
            <ReportsPageContent />
        </AppContent>
    )
}
