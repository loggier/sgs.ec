
'use client';

import * as React from 'react';
import { getClientById } from '@/lib/actions';
import { getUnitsByClientId } from '@/lib/unit-actions';
import UnitList from '@/components/unit-list';
import UnitSummary from '@/components/unit-summary';
import { notFound, useParams } from 'next/navigation';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import type { ClientDisplay } from '@/lib/schema';
import type { Unit } from '@/lib/unit-schema';
import { Skeleton } from '@/components/ui/skeleton';
import AppContent from '@/components/app-content';

export const dynamic = 'force-dynamic';

function UnitsPageContent() {
  const { user } = useAuth();
  const params = useParams();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;

  const [client, setClient] = React.useState<ClientDisplay | null>(null);
  const [units, setUnits] = React.useState<Unit[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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
