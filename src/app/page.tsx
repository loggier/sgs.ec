
'use client';
 
import * as React from 'react';
import { getClients } from '@/lib/actions';
import { getAllUnits } from '@/lib/unit-actions';
import { getWoxClients } from '@/lib/wox-actions';
import ClientList from '@/components/client-list';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import type { ClientWithOwner } from '@/lib/schema';
import type { Unit } from '@/lib/unit-schema';
import { Skeleton } from '@/components/ui/skeleton';
import ClientSummary from '@/components/client-summary';
import AppContent from '@/components/app-content';
import type { Timestamp } from 'firebase/firestore';

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
        getAllUnits(user.id, user.role),
        getWoxClients() // Fetch clients from WOX
      ]).then(([clientData, unitData, woxData]) => {
          const combinedClients = [...clientData, ...woxData.clients];
          setClients(combinedClients);
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
        .filter(unit => {
          const nextPaymentDateSource = unit.fechaSiguientePago;
          if (!nextPaymentDateSource) return false;
          
          const nextPaymentDate = (nextPaymentDateSource as Timestamp).toDate 
            ? (nextPaymentDateSource as Timestamp).toDate()
            : new Date(nextPaymentDateSource);
            
          return nextPaymentDate && nextPaymentDate < new Date();
        })
        .map(unit => unit.clientId)
    );

    return clients.map(client => {
      // Don't change status for WOX clients
      if (client.source === 'wox') return client;

      if (overdueClientIds.has(client.id!)) {
        return { ...client, estado: 'adeuda' };
      }
      return client;
    });
  }, [clients, units, isLoading]);


  const summaryData = React.useMemo(() => {
    const internalClients = clientsWithDynamicStatus.filter(c => c.source !== 'wox');
    if (!internalClients || internalClients.length === 0) {
      return {
        totalClients: clientsWithDynamicStatus.length, // Show total from all sources
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
      totalPaidValue: internalClients.reduce((sum, c) => sum + (c.valorPago || 0), 0),
      totalOverdueValue: internalClients.reduce((sum, c) => sum + (c.valorVencido || 0), 0),
      clientsByStatus: internalClients.reduce((acc, client) => {
        const status = client.estado || 'desconocido';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalMonthlyIncome,
    };
  }, [clientsWithDynamicStatus, units]);

  if (isLoading) {
      return (
          <>
              <Header title="Clientes" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
              </div>
              <Skeleton className="h-96 w-full mt-6" />
          </>
      )
  }

  return (
    <>
      <Header title="Clientes" />
      <div className="space-y-6">
        <ClientSummary {...summaryData} />
        <ClientList initialClients={clientsWithDynamicStatus} />
      </div>
    </>
  );
}

export default function Home() {
    return (
        <AppContent>
            <HomePageContent />
        </AppContent>
    )
}
