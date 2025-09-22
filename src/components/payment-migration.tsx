
'use client';

import * as React from 'react';
import { Button } from './ui/button';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Loader2, Database, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { migrateNestedPayments } from '@/lib/payment-actions';

type PaymentMigrationProps = {
    onMigrationComplete: () => void;
};

export default function PaymentMigration({ onMigrationComplete }: PaymentMigrationProps) {
    const [isMigrating, setIsMigrating] = React.useState(false);
    const { toast } = useToast();

    const handleMigration = async () => {
        setIsMigrating(true);
        toast({
            title: "Iniciando migración...",
            description: "Moviendo los registros de pagos a la nueva estructura. Esto puede tardar unos momentos.",
        });

        const result = await migrateNestedPayments();

        if (result.success) {
            toast({
                title: "Migración Exitosa",
                description: result.message,
            });
            onMigrationComplete();
        } else {
            toast({
                title: "Error en la Migración",
                description: result.message,
                variant: "destructive",
            });
        }
        setIsMigrating(false);
    };

    return (
        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="h-6 w-6 text-blue-600" />
                    Actualización de Base de Datos
                </CardTitle>
                <CardDescription>
                    Para mejorar el rendimiento, los registros de pago se moverán a una nueva estructura.
                    Esta acción es necesaria y solo debe realizarse una vez.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Acción Requerida</AlertTitle>
                    <AlertDescription>
                        Haga clic en el botón de abajo para iniciar la migración de datos. El proceso es seguro y no duplicará información si se ejecuta varias veces.
                    </AlertDescription>
                </Alert>
                <Button onClick={handleMigration} disabled={isMigrating} className="mt-4">
                    {isMigrating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Migrando datos...</>
                    ) : (
                        'Migrar Pagos Anteriores'
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
