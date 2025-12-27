
'use client';

import * as React from 'react';
import { getInstallationOrders } from '@/lib/installation-order-actions';
import InstallationOrderList from '@/components/installation-order-list';
import Header from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import type { InstallationOrder } from '@/lib/installation-order-schema';
import AppContent from '@/components/app-content';
import { useAuth } from '@/context/auth-context';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function InstallationsPageContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [orders, setOrders] = React.useState<InstallationOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchOrders = React.useCallback(() => {
    if (user) {
        setIsLoading(true);
        getInstallationOrders(user).then(data => {
            setOrders(data);
            setIsLoading(false);
        });
    }
  }, [user]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);


  if (isAuthLoading || isLoading) {
    return (
       <>
         <Header title="Órdenes de Instalación" />
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
       <Header title="Órdenes de Instalación" />
       <InstallationOrderList initialOrders={orders} onDataChange={fetchOrders} />
    </>
  );
}

export default function InstallationsPage() {
    return (
        <AppContent>
            <InstallationsPageContent />
        </AppContent>
    )
}
