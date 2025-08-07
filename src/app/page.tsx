
'use client';
 
import * as React from 'react';
import { getClients } from '@/lib/actions';
import { getAllUnits } from '@/lib/unit-actions';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import type { ClientDisplay } from '@/lib/schema';
import type { Unit } from '@/lib/unit-schema';
import { Skeleton } from '@/components/ui/skeleton';
import AppContent from '@/components/app-content';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Car, AlertTriangle, CircleDollarSign } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell } from 'recharts';

type UnitWithClient = Unit & { clientName: string; ownerName?: string };

const planDisplayNames: Record<Unit['tipoPlan'], string> = {
  'estandar-sc': 'Estándar SC',
  'avanzado-sc': 'Avanzado SC',
  'total-sc': 'Total SC',
  'estandar-cc': 'Estándar CC',
  'avanzado-cc': 'Avanzado CC',
  'total-cc': 'Total CC',
};

const statusDisplayNames: Record<ClientDisplay['estado'], string> = {
    'al dia': 'Al día',
    'adeuda': 'Adeuda',
    'retirado': 'Retirado'
};

const COLORS = ['#16a34a', '#facc15', '#dc2626']; // green, yellow, red

function DashboardPageContent() {
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
        
        setClients(internalClients);
        setUnits(unitData as UnitWithClient[]);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
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

  const dashboardData = React.useMemo(() => {
    const overdueUnits = units.filter(unit => unit.fechaSiguientePago && new Date(unit.fechaSiguientePago) < new Date()).length;
    
    const totalMonthlyRevenue = units.reduce((sum, unit) => {
        if (unit.tipoContrato === 'con_contrato' && unit.mesesContrato) {
          const monthlyCost = (unit.costoTotalContrato ?? 0) / unit.mesesContrato;
          return sum + monthlyCost;
        }
        return sum + (unit.costoMensual ?? 0);
    }, 0);

    const unitsByPlan = units.reduce((acc, unit) => {
        const planName = planDisplayNames[unit.tipoPlan] || 'Desconocido';
        acc[planName] = (acc[planName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const unitsByPlanChartData = Object.entries(unitsByPlan).map(([name, value]) => ({ name, total: value }));

    const clientsByStatus = clientsWithDynamicStatus.reduce((acc, client) => {
        const status = client.estado || 'desconocido';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const clientsByStatusChartData = Object.entries(clientsByStatus)
      .map(([name, value]) => ({ name: statusDisplayNames[name as ClientDisplay['estado']], value }))
      .filter(item => item.name); // Filter out undefined names

    return {
      totalClients: clients.length,
      totalUnits: units.length,
      overdueUnits,
      totalMonthlyRevenue,
      unitsByPlanChartData,
      clientsByStatusChartData,
    };
  }, [clients, units, clientsWithDynamicStatus]);

  if (isLoading) {
      return (
          <>
              <Header title="Dashboard" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 mt-6">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
              </div>
          </>
      )
  }

  return (
    <>
      <Header title="Dashboard" />
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.totalClients}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Unidades</CardTitle>
                    <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.totalUnits}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Facturación Mensual</CardTitle>
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(dashboardData.totalMonthlyRevenue)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unidades Vencidas</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{dashboardData.overdueUnits}</div>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
                <CardHeader>
                    <CardTitle>Unidades por Plan</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={dashboardData.unitsByPlanChartData}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                }}
                            />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
             <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>Clientes por Estado</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                }}
                            />
                            <Pie
                                data={dashboardData.clientsByStatusChartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {dashboardData.clientsByStatusChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}

export default function Home() {
    return (
        <AppContent>
            <DashboardPageContent />
        </AppContent>
    )
}
