
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getWorkOrders } from '@/lib/work-order-actions';
import WorkOrderList from '@/components/work-order-list';
import Header from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import type { WorkOrder } from '@/lib/work-order-schema';
import AppContent from '@/components/app-content';
import { useAuth } from '@/context/auth-context';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function WorkOrdersPageContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [workOrders, setWorkOrders] = React.useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchWorkOrders = React.useCallback(() => {
    if (user) {
        setIsLoading(true);
        getWorkOrders(user).then(data => {
            setWorkOrders(data);
            setIsLoading(false);
        });
    }
  }, [user]);

  React.useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);


  if (isAuthLoading || isLoading) {
    return (
       <>
         <Header title="Órdenes de Trabajo" />
         <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
         </div>
       </>
    )
  }
  
  if (!user) {
      return (
        <>
            <Header title="Acceso Denegado" />
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No tienes permiso</AlertTitle>
                <AlertDescription>
                    Debes iniciar sesión para ver esta página.
                </AlertDescription>
            </Alert>
        </>
      )
  }

  return (
    <>
       <Header title="Órdenes de Trabajo" />
       <WorkOrderList initialOrders={workOrders} onDataChange={fetchWorkOrders} />
    </>
  );
}

export default function WorkOrdersPage() {
    return (
        <AppContent>
            <WorkOrdersPageContent />
        </AppContent>
    )
}
