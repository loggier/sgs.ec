
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
import MainContent from '@/components/main-content';

type UnitWithClient = Unit & { clientName: string; ownerName?: string };

function HomePageContent() {
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

  const clientsWithDynamicStatus = React.useMemo(() => {
    if (isLoading) return [];
    
    const overdueClientIds = new Set(
      units
        .filter(unit => new Date(unit.fechaSiguientePago) < new Date())
        .map(unit => unit.clientId)
    );

    return clients.map(client => {
      if (overdueClientIds.has(client.id!)) {
        return { ...client, estado: 'adeuda' };
      }
      return client;
    });
  }, [clients, units, isLoading]);


  const summaryData = React.useMemo(() => {
    if (!clientsWithDynamicStatus || clientsWithDynamicStatus.length === 0) {
      return {
        totalClients: 0,
        totalUnits: 0,
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
      totalClients: clientsWithDynamicStatus.length,
      totalUnits: units.length,
      totalPaidValue: clientsWithDynamicStatus.reduce((sum, c) => sum + (c.valorPago || 0), 0),
      totalOverdueValue: clientsWithDynamicStatus.reduce((sum, c) => sum + (c.valorVencido || 0), 0),
      clientsByStatus: clientsWithDynamicStatus.reduce((acc, client) => {
        const status = client.estado || 'desconocido';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalMonthlyIncome,
    };
  }, [clientsWithDynamicStatus, units]);

  if (isLoading) {
      return (
          <div className="flex flex-col h-full">
              <Header title="Clientes" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
              </div>
              <Skeleton className="h-96 w-full mt-6" />
          </div>
      )
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Clientes" />
      <div className="space-y-6">
        <ClientSummary {...summaryData} />
        <ClientList initialClients={clientsWithDynamicStatus} />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <MainContent>
      <HomePageContent />
    </MainContent>
  )
}
