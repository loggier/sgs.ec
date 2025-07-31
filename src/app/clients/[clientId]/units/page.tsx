
'use client';

import * as React from 'react';
import { getClientById } from '@/lib/actions';
import { getUnitsByClientId, importWoxDevicesAsUnits } from '@/lib/unit-actions';
import UnitList from '@/components/unit-list';
import UnitSummary from '@/components/unit-summary';
import { notFound, useParams } from 'next/navigation';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import type { ClientDisplay } from '@/lib/schema';
import type { Unit } from '@/lib/unit-schema';
import { Skeleton } from '@/components/ui/skeleton';
import AppContent from '@/components/app-content';
import { Button } from '@/components/ui/button';
import { DownloadCloud, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

function UnitsPageContent() {
  const { user } = useAuth();
  const params = useParams();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const { toast } = useToast();

  const [client, setClient] = React.useState<ClientDisplay | null>(null);
  const [units, setUnits] = React.useState<Unit[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const fetchData = React.useCallback(() => {
    if (user && clientId) {
      setIsLoading(true);
      Promise.all([
        getClientById(clientId, user.id, user.role),
        getUnitsByClientId(clientId)
      ]).then(([clientData, unitsData]) => {
        if (!clientData) {
          notFound();
        } else {
          setClient(clientData);
          setUnits(unitsData);
        }
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
        notFound();
      });
    }
  }, [clientId, user]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSyncWithWox = async () => {
    if (!client || !client.woxId) {
        toast({
            title: 'Cliente no vinculado',
            description: 'Este cliente no está vinculado a WOX. Edite el cliente y añada un "Usuario (API)" para vincularlo.',
            variant: 'destructive',
        });
        return;
    }

    setIsSyncing(true);
    try {
        const result = await importWoxDevicesAsUnits(client.id, client.woxId);
        if (result.success) {
            toast({
                title: 'Sincronización completada',
                description: `${result.importedCount} unidad(es) nueva(s) importada(s) desde WOX.`,
            });
            fetchData(); // Refresh data
        } else {
            toast({
                title: 'Error de Sincronización',
                description: result.message,
                variant: 'destructive',
            });
        }
    } catch (error) {
        toast({
            title: 'Error Inesperado',
            description: 'Ocurrió un error al intentar sincronizar con WOX.',
            variant: 'destructive',
        });
    } finally {
        setIsSyncing(false);
    }
};

  if (isLoading || !client) {
    return (
      <>
        <Header title="Cargando..." showBackButton backButtonHref="/" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full mt-6" />
      </>
    );
  }

  // Calculate summary data
  const totalUnits = units.length;
  const totalMonthlyAmount = units.reduce((sum, unit) => {
    if (unit.tipoContrato === 'con_contrato') {
      const monthlyCost = (unit.costoTotalContrato ?? 0) / (unit.mesesContrato ?? 1);
      return sum + monthlyCost;
    }
    return sum + (unit.costoMensual ?? 0);
  }, 0);
  
  const unitsByPlan = units.reduce((acc, unit) => {
    const plan = unit.tipoPlan || 'desconocido';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unitsByContractType = units.reduce((acc, unit) => {
    const contractType = unit.tipoContrato || 'desconocido';
    acc[contractType] = (acc[contractType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <Header title={`Unidades de ${client.nomSujeto}`} showBackButton backButtonHref="/" />
      <div className='flex justify-end mb-6'>
          {client.woxId && (
              <Button onClick={handleSyncWithWox} disabled={isSyncing}>
                  {isSyncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                      <DownloadCloud className="mr-2 h-4 w-4" />
                  )}
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar con WOX'}
              </Button>
          )}
      </div>
      <div className="space-y-6">
        <UnitSummary 
          totalUnits={totalUnits}
          totalAmount={totalMonthlyAmount}
          unitsByPlan={unitsByPlan}
          unitsByContractType={unitsByContractType}
        />
        <UnitList 
            initialUnits={units} 
            clientId={clientId} 
            clientWoxId={client.woxId} 
            onDataChange={fetchData} 
        />
      </div>
    </>
  );
}

export default function UnitsPage() {
    return (
        <AppContent>
            <UnitsPageContent />
        </AppContent>
    )
}
