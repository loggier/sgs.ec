
'use client';

import * as React from 'react';
import { getClients } from '@/lib/actions';
import { getAllUnits } from '@/lib/unit-actions';
import ClientList from '@/components/client-list';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import type { ClientWithOwner } from '@/lib/schema';
import type { Unit } from '@/lib/unit-schema';
import { Skeleton } from '@/components/ui/skeleton';
import ClientSummary from '@/components/client-summary';

type UnitWithClient = Unit & { clientName: string; ownerName?: string };

export default function Home() {
  const { user } = useAuth();
  const [clients, setClients] = React.useState<ClientWithOwner[]>([]);
  const [units, setUnits] = React.useState<UnitWithClient[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([
        getClients(user.id, user.role),
        getAllUnits(user.id, user.role)
      ]).then(([clientData, unitData]) => {
          setClients(clientData);
          setUnits(unitData);
          setIsLoading(false);
      }).catch(() => {
          setIsLoading(false);
      });
    }
  }, [user]);

  const summaryData = React.useMemo(() => {
    if (!clients || clients.length === 0) {
      return {
        totalClients: 0,
        totalOperationValue: 0,
        totalPaidValue: 0,
        totalOverdueValue: 0,
        clientsByStatus: {},
        totalMonthlyIncome: 0,
      };
    }
    
    const totalMonthlyIncome = units.reduce((sum, unit) => {
        if (unit.tipoContrato === 'con_contrato') {
            const monthlyCost = (unit.costoTotalContrato ?? 0) / (unit.mesesContrato ?? 1);
            return sum + monthlyCost;
        }
        return sum + (unit.costoMensual ?? 0);
    }, 0);

    return {
      totalClients: clients.length,
      totalOperationValue: clients.reduce((sum, c) => sum + (c.valOperacion || 0), 0),
      totalPaidValue: clients.reduce((sum, c) => sum + (c.valorPago || 0), 0),
      totalOverdueValue: clients.reduce((sum, c) => sum + (c.valorVencido || 0), 0),
      clientsByStatus: clients.reduce((acc, client) => {
        const status = client.estado || 'desconocido';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalMonthlyIncome,
    };
  }, [clients, units]);

  if (isLoading) {
      return (
          <div className="flex flex-col h-full space-y-6">
              <Header title="Clientes" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
              </div>
              <Skeleton className="h-96 w-full" />
          </div>
      )
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <Header title="Clientes" />
      <ClientSummary {...summaryData} />
      <ClientList initialClients={clients} />
    </div>
  );
}
