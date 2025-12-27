
'use client';
 
import * as React from 'react';
import { getDashboardData } from '@/lib/actions';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import type { ClientDisplay } from '@/lib/schema';
import type { Unit } from '@/lib/unit-schema';
import { Skeleton } from '@/components/ui/skeleton';
import AppContent from '@/components/app-content';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Car, AlertTriangle, CircleDollarSign, Building } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell } from 'recharts';
import TechnicianDashboard from '@/components/technician-dashboard';

type UnitWithClient = Unit & { clientName: string; ownerName?: string };

const planDisplayNames: Record<string, string> = {
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

type DashboardDataType = {
  totalClients: number;
  totalUnits: number;
  overdueUnits: number;
  totalMonthlyRevenue: number;
  topClients: { name: string; units: number }[];
  unitsByPlan: Record<string, number>;
  clientsByStatus: Record<string, number>;
  installationsByCategory: Record<string, number>;
  installationsByVehicle: Record<string, number>;
  installationsBySegment: Record<string, number>;
  workOrdersByPriority: Record<string, number>;
}

function DashboardPageContent() {
  const { user } = useAuth();
  const [data, setData] = React.useState<DashboardDataType | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user && user.role !== 'tecnico') {
      setIsLoading(true);
      getDashboardData(user)
        .then(setData)
        .catch(error => console.error("Failed to fetch dashboard data:", error))
        .finally(() => setIsLoading(false));
    } else {
        setIsLoading(false);
    }
  }, [user]);

  if (user?.role === 'tecnico') {
      return (
          <>
            <Header title="Mis Órdenes de Trabajo" />
            <TechnicianDashboard />
          </>
      )
  }

  const chartData = React.useMemo(() => {
    if (!data) return null;
    
    const unitsByPlanChartData = Object.entries(data.unitsByPlan)
        .map(([name, value]) => ({ name: planDisplayNames[name] || 'Desconocido', total: value }));

    const clientsByStatusChartData = Object.entries(data.clientsByStatus)
      .map(([name, value]) => ({ name: statusDisplayNames[name as ClientDisplay['estado']], value }))
      .filter(item => item.name);
      
    const installationsByCategoryChartData = Object.entries(data.installationsByCategory).map(([name, value]) => ({ name, total: value }));
    const installationsByVehicleChartData = Object.entries(data.installationsByVehicle).map(([name, value]) => ({ name, total: value }));
    const installationsBySegmentChartData = Object.entries(data.installationsBySegment).map(([name, value]) => ({ name, total: value }));
    const workOrdersByPriorityChartData = Object.entries(data.workOrdersByPriority).map(([name, value]) => ({ name, total: value }));


    return {
      unitsByPlanChartData,
      clientsByStatusChartData,
      installationsByCategoryChartData,
      installationsByVehicleChartData,
      installationsBySegmentChartData,
      workOrdersByPriorityChartData,
    };
  }, [data]);

  if (isLoading || !data || !chartData) {
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

  const renderBarChart = (chartData: {name: string, total: number}[], title: string) => (
     <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} />
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
  );

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
                    <div className="text-2xl font-bold">{data.totalClients}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Unidades</CardTitle>
                    <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.totalUnits}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Facturación Mensual</CardTitle>
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(data.totalMonthlyRevenue)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unidades Vencidas</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{data.overdueUnits}</div>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
             <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Top Clientes por Unidades</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.topClients.map((client, index) => (
                            <div key={index} className="flex items-center">
                                <Building className="h-5 w-5 text-muted-foreground" />
                                <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">{client.name}</p>
                                <p className="text-sm text-muted-foreground">{client.units} unidades</p>
                                </div>
                                <div className="ml-auto font-medium">#{index + 1}</div>
                            </div>
                        ))}
                         {data.topClients.length === 0 && <p className="text-sm text-muted-foreground">No hay suficientes datos.</p>}
                    </div>
                </CardContent>
            </Card>
             <Card className="lg:col-span-2">
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
                                data={chartData.clientsByStatusChartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {chartData.clientsByStatusChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {renderBarChart(chartData.unitsByPlanChartData, "Unidades por Plan")}
            {renderBarChart(chartData.workOrdersByPriorityChartData, "Órdenes de Soporte por Prioridad")}
        </div>
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {renderBarChart(chartData.installationsByCategoryChartData, "Instalaciones por Categoría")}
            {renderBarChart(chartData.installationsByVehicleChartData, "Instalaciones por Tipo de Vehículo")}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
             {renderBarChart(chartData.installationsBySegmentChartData, "Instalaciones por Segmento")}
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
