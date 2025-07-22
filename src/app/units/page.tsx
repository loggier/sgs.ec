
'use client';

import * as React from 'react';
import { getAllUnits } from '@/lib/unit-actions';
import GlobalUnitList from '@/components/global-unit-list';
import UnitSummary from '@/components/unit-summary';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import type { Unit } from '@/lib/unit-schema';
import { Skeleton } from '@/components/ui/skeleton';

type GlobalUnit = Unit & { clientName: string; ownerName?: string; };

export default function GlobalUnitsPage() {
  const { user } = useAuth();
  const [units, setUnits] = React.useState<GlobalUnit[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchUnits = React.useCallback(() => {
    if (user) {
      setIsLoading(true);
      getAllUnits(user.id, user.role)
        .then(data => {
          setUnits(data);
          setIsLoading(false);
        });
    }
  }, [user]);

  React.useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Todas las Unidades" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full mt-6" />
      </div>
    );
  }

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
    <div className="flex flex-col h-full">
      <Header title="Todas las Unidades" />
      <div className="space-y-6">
        <UnitSummary 
          totalUnits={totalUnits}
          totalAmount={totalMonthlyAmount}
          unitsByPlan={unitsByPlan}
          unitsByContractType={unitsByContractType}
        />
        <GlobalUnitList initialUnits={units} onDataChange={fetchUnits} />
      </div>
    </div>
  );
}
