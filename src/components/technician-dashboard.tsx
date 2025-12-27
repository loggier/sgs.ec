
'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { getWorkOrders } from '@/lib/work-order-actions';
import type { WorkOrder } from '@/lib/work-order-schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ListTodo, Wrench, CheckCircle } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

type DashboardStats = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
};

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user?.role === 'tecnico') {
      setIsLoading(true);
      getWorkOrders(user)
        .then((orders) => {
          const newStats: DashboardStats = orders.reduce(
            (acc, order) => {
              acc.total += 1;
              if (order.estado === 'pendiente') {
                acc.pending += 1;
              } else if (order.estado === 'en-progreso') {
                acc.inProgress += 1;
              } else if (order.estado === 'completada') {
                acc.completed += 1;
              }
              return acc;
            },
            { total: 0, pending: 0, inProgress: 0, completed: 0 }
          );
          setStats(newStats);
        })
        .catch((error) => {
          console.error("Failed to fetch technician work orders:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [user]);

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">Listas para iniciar</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Órdenes en Progreso</CardTitle>
          <Wrench className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
           <p className="text-xs text-muted-foreground">Actualmente en ejecución</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Órdenes Completadas</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
           <p className="text-xs text-muted-foreground">Trabajos finalizados</p>
        </CardContent>
      </Card>
    </div>
  );
}
