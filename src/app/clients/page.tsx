'use client';
 
import * as React from 'react';
import { getClients } from '@/lib/actions';
import { getAllUnits } from '@/lib/unit-actions';
import { triggerManualNotificationCheck } from '@/lib/notification-actions';
import ClientList from '@/components/client-list';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import type { ClientDisplay } from '@/lib/schema';
import type { Unit } from '@/lib/unit-schema';
import { Skeleton } from '@/components/ui/skeleton';
import ClientSummary from '@/components/client-summary';
import AppContent from '@/components/app-content';
import { Button } from '@/components/ui/button';
import { BellRing, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SendRemindersDialog from '@/components/send-reminders-dialog';

type UnitWithClient = Unit & { clientName: string; ownerName?: string };

function ClientsPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = React.useState<ClientDisplay[]>([]);
  const [units, setUnits] = React.useState<UnitWithClient[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isNotifying, setIsNotifying] = React.useState(false);
  const [isRemindersDialogOpen, setIsRemindersDialogOpen] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        const [enrichedClients, unitData] = await Promise.all([
            getClients(user.id, user.role, user.creatorId),
            getAllUnits(user),
        ]);
        
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
          
          const nextPaymentDate = new Date(nextPaymentDateSource);
            
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
  
  const handleManualNotifications = async () => {
      if (!user) return;
      
      setIsRemindersDialogOpen(false);
      setIsNotifying(true);

      toast({
          title: 'Iniciando proceso...',
          description: 'Buscando unidades y enviando recordatorios. Esto puede tardar un momento.',
      });
      const result = await triggerManualNotificationCheck(user);
      if (result.success) {
          toast({
              title: 'Proceso completado',
              description: result.message,
          });
      } else {
           toast({
              title: 'Error en el proceso',
              description: result.message,
              variant: 'destructive',
          });
      }
      setIsNotifying(false);
  };

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
      <Header title="Clientes">
         {user && ['master', 'manager'].includes(user.role) && (
            <Button onClick={() => setIsRemindersDialogOpen(true)} disabled={isNotifying}>
                {isNotifying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <BellRing className="mr-2 h-4 w-4" />
                )}
                {isNotifying ? 'Enviando...' : 'Enviar Recordatorios de Pago'}
            </Button>
          )}
      </Header>
      <div className="space-y-6">
        <ClientSummary {...summaryData} />
        <ClientList initialClients={clientsWithDynamicStatus} onDataChange={fetchData} />
      </div>

      <SendRemindersDialog
        isOpen={isRemindersDialogOpen}
        onOpenChange={setIsRemindersDialogOpen}
        onConfirm={handleManualNotifications}
        isSending={isNotifying}
      />
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
