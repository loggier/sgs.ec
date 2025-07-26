
'use client';
 
import * as React from 'react';
import { getClients } from '@/lib/actions';
import { getAllUnits } from '@/lib/unit-actions';
import { getWoxClients, getWoxClientData } from '@/lib/wox-actions';
import ClientList from '@/components/client-list';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import type { ClientDisplay } from '@/lib/schema';
import type { Unit } from '@/lib/unit-schema';
import { Skeleton } from '@/components/ui/skeleton';
import ClientSummary from '@/components/client-summary';
import AppContent from '@/components/app-content';
import type { Timestamp } from 'firebase/firestore';

type UnitWithClient = Unit & { clientName: string; ownerName?: string };

function HomePageContent() {
  const { user } = useAuth();
  const [clients, setClients] = React.useState<ClientDisplay[]>([]);
  const [units, setUnits] = React.useState<UnitWithClient[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([
        getClients(user.id, user.role),
        getAllUnits(user.id, user.role),
        getWoxClients(),
        getWoxClientData(),
      ]).then(([internalClients, unitData, woxResult, woxEnrichedData]) => {
          
          // Enrich WOX clients with local data
          const enrichedWoxClients = woxResult.clients.map(woxClient => {
              const localData = woxEnrichedData.get(woxClient.id);
              if (localData) {
                  return { ...woxClient, ...localData };
              }
              return woxClient;
          });

          const combinedClients: ClientDisplay[] = [...internalClients, ...enrichedWoxClients];
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
      if (overdueClientIds.has(client.id!)) {
        return { ...client, estado: 'adeuda' };
      }
      return client;
    });
  }, [clients, units, isLoading]);


  const summaryData = React.useMemo(() => {
    return {
      totalClients: clientsWithDynamicStatus.length,
      totalUnits: units.length,
      clientsByStatus: clientsWithDynamicStatus.reduce((acc, client) => {
        const status = client.estado || 'desconocido';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
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
