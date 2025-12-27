
'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { getWorkOrders } from '@/lib/work-order-actions';
import { getInstallationOrders } from '@/lib/installation-order-actions';
import type { WorkOrder } from '@/lib/work-order-schema';
import type { InstallationOrder } from '@/lib/installation-order-schema';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ListTodo, Wrench, CheckCircle, HardHat, Building, History } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type OrderStats = {
  pending: number;
  inProgress: number;
  completed: number;
};

type TechnicianDashboardData = {
    workOrderStats: OrderStats;
    installationOrderStats: OrderStats;
    topClients: { name: string; count: number }[];
    recentActivity: (WorkOrder | InstallationOrder)[];
};

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = React.useState<TechnicianDashboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user?.role === 'tecnico') {
      setIsLoading(true);
      Promise.all([
        getWorkOrders(user),
        getInstallationOrders(user),
      ]).then(([workOrders, installationOrders]) => {
          
          const workOrderStats: OrderStats = workOrders.reduce(
            (acc, order) => {
              if (order.estado === 'pendiente') acc.pending += 1;
              else if (order.estado === 'en-progreso') acc.inProgress += 1;
              else if (order.estado === 'completada') acc.completed += 1;
              return acc;
            },
            { pending: 0, inProgress: 0, completed: 0 }
          );
          
          const installationOrderStats: OrderStats = installationOrders.reduce(
            (acc, order) => {
              if (order.estado === 'pendiente') acc.pending += 1;
              else if (order.estado === 'en-curso') acc.inProgress += 1;
              else if (order.estado === 'terminado') acc.completed += 1;
              return acc;
            },
            { pending: 0, inProgress: 0, completed: 0 }
          );

          const allCompletedOrders = [
              ...workOrders.filter(o => o.estado === 'completada'),
              ...installationOrders.filter(o => o.estado === 'terminado')
          ];
          
          const clientCounts = allCompletedOrders.reduce((acc, order) => {
              acc[order.nombreCliente] = (acc[order.nombreCliente] || 0) + 1;
              return acc;
          }, {} as Record<string, number>);

          const topClients = Object.entries(clientCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

          const recentActivity = allCompletedOrders
            .sort((a, b) => new Date(b.fechaProgramada).getTime() - new Date(a.fechaProgramada).getTime())
            .slice(0, 5);

          setDashboardData({
              workOrderStats,
              installationOrderStats,
              topClients,
              recentActivity
          });

        }).catch((error) => {
          console.error("Failed to fetch technician work orders:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [user]);

  if (isLoading || !dashboardData) {
    return (
        <div className="space-y-6">
            <div>
                 <Skeleton className="h-8 w-48 mb-4" />
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
            </div>
             <div>
                 <Skeleton className="h-8 w-48 mb-4" />
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
             </div>
        </div>
    );
  }

  const { workOrderStats, installationOrderStats, topClients, recentActivity } = dashboardData;
  const totalCompletedSupport = workOrderStats.completed;
  const totalCompletedInstallations = installationOrderStats.completed;

  return (
    <div className="space-y-8">
      <div>
        <CardTitle className="text-xl mb-4">Órdenes de Soporte</CardTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workOrderStats.pending}</div>
              <p className="text-xs text-muted-foreground">Listas para iniciar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
              <Wrench className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{workOrderStats.inProgress}</div>
              <p className="text-xs text-muted-foreground">Actualmente en ejecución</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{workOrderStats.completed}</div>
              <p className="text-xs text-muted-foreground">Trabajos finalizados</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div>
        <CardTitle className="text-xl mb-4">Órdenes de Instalación</CardTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{installationOrderStats.pending}</div>
              <p className="text-xs text-muted-foreground">Listas para iniciar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Curso</CardTitle>
              <HardHat className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{installationOrderStats.inProgress}</div>
              <p className="text-xs text-muted-foreground">Actualmente en ejecución</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Terminadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{installationOrderStats.completed}</div>
              <p className="text-xs text-muted-foreground">Trabajos finalizados</p>
            </CardContent>
          </Card>
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card>
            <CardHeader>
                <CardTitle>Rendimiento General</CardTitle>
                <CardDescription>Resumen de tus trabajos completados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center">
                    <Wrench className="h-5 w-5 text-muted-foreground" />
                    <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Soportes Completados</p>
                    </div>
                    <div className="ml-auto font-medium">{totalCompletedSupport}</div>
                </div>
                <div className="flex items-center">
                    <HardHat className="h-5 w-5 text-muted-foreground" />
                    <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Instalaciones Completadas</p>
                    </div>
                    <div className="ml-auto font-medium">{totalCompletedInstallations}</div>
                </div>
                 <div className="flex items-center pt-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div className="ml-4 space-y-1">
                    <p className="text-sm font-bold leading-none">Total de Trabajos</p>
                    </div>
                    <div className="ml-auto font-bold text-lg">{totalCompletedSupport + totalCompletedInstallations}</div>
                </div>
            </CardContent>
           </Card>
           <Card>
            <CardHeader>
                <CardTitle>Top Clientes Atendidos</CardTitle>
                <CardDescription>Los clientes que más has visitado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {topClients.length > 0 ? topClients.map((client, index) => (
                    <div key={index} className="flex items-center">
                        <Building className="h-5 w-5 text-muted-foreground" />
                        <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{client.name}</p>
                        </div>
                        <div className="ml-auto font-medium">{client.count} visita(s)</div>
                    </div>
                )) : <p className="text-sm text-muted-foreground">No hay trabajos completados aún.</p>}
            </CardContent>
           </Card>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Tus últimos 5 trabajos completados.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {recentActivity.length > 0 ? recentActivity.map((order) => (
                        <div key={order.id} className="flex items-center">
                            <History className="h-5 w-5 text-muted-foreground" />
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    { 'descripcion' in order ? 'Soporte' : 'Instalación'} para <span className="font-bold">{order.nombreCliente}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {order.placaVehiculo} - Completado el {format(new Date(order.fechaProgramada), 'PPP', { locale: es })}
                                </p>
                            </div>
                        </div>
                    )) : <p className="text-sm text-muted-foreground">No hay actividad reciente.</p>}
                </div>
            </CardContent>
        </Card>

    </div>
  );
}
