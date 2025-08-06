
'use client';
 
import * as React from 'react';
import { getClients } from '@/lib/actions';
import { getPgpsClientDetailsById } from '@/lib/pgps-actions';
import { getAllUnits } from '@/lib/unit-actions';
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

function ClientsPageContent() {
  const { user } = useAuth();
  const [clients, setClients] = React.useState<ClientDisplay[]>([]);
  const [units, setUnits] = React.useState<UnitWithClient[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        const [internalClients, unitData] = await Promise.all([
            getClients(user.id, user.role, user.creatorId),
            getAllUnits(user),
        ]);

        // Enrich internal clients with P. GPS data if linked
        const enrichedClients = await Promise.all(
            internalClients.map(async (client) => {
                let enrichedClient: ClientDisplay = { ...client };
                if (client.pgpsId) {
                    const pgpsDetails = await getPgpsClientDetailsById(client.pgpsId);
                    if (pgpsDetails) {
                        enrichedClient = {
                            ...enrichedClient,
                            correo: pgpsDetails.correo,
                            telefono: pgpsDetails.telefono || client.telefono,
                        };
                    }
                }

                // Calculate financial totals and unit count for this client
                const clientUnits = unitData.filter(u => u.clientId === client.id);
                const unitCount = clientUnits.length;
                const financials = clientUnits.reduce((acc, unit) => {
                    if (unit.tipoContrato === 'con_contrato') {
                        acc.totalContractAmount += unit.costoTotalContrato ?? 0;
                        acc.totalContractBalance += unit.saldoContrato ?? 0;
                        const monthlyContractPayment = (unit.costoTotalContrato ?? 0) / (unit.mesesContrato || 1);
                        acc.totalMonthlyPayment += monthlyContractPayment;
                    } else {
                        acc.totalMonthlyPayment += unit.costoMensual ?? 0;
                    }
                    return acc;
                }, { totalContractAmount: 0, totalContractBalance: 0, totalMonthlyPayment: 0 });

                return {
                    ...enrichedClient,
                    ...financials,
                    unitCount,
                };
            })
        );
        
        setClients(enrichedClients);
        setUnits(unitData as UnitWithClient[]);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [user]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <ClientList initialClients={clientsWithDynamicStatus} onDataChange={fetchData} />
      </div>
    </>
  );
}

export default function ClientsPage() {
    return (
        <AppContent>
            <ClientsPageContent />
        </AppContent>
    )
}
