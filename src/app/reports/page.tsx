
'use client';

import * as React from 'react';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import { useAuth } from '@/context/auth-context';
import { getInstallationOrders } from '@/lib/installation-order-actions';
import type { InstallationOrder } from '@/lib/installation-order-schema';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, HardHat, Calendar, CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MultiSelectCombobox, type ComboboxOption } from '@/components/ui/multi-select-combobox';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  LabelList,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// New component for the reports dashboard
function InstallationReportsDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = React.useState<InstallationOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedYears, setSelectedYears] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    if (user) {
      setIsLoading(true);
      getInstallationOrders(user)
        .then(data => {
          const validData = data.filter(o => o.fechaProgramada && !isNaN(new Date(o.fechaProgramada).getTime()));
          setOrders(validData);
          // Get unique years from data and select latest 2 by default
          const years = [...new Set(validData.map(o => new Date(o.fechaProgramada).getFullYear().toString()))]
            .sort((a, b) => Number(b) - Number(a));
          setSelectedYears(years.slice(0, 2));
        })
        .catch(error => console.error("Failed to fetch installation orders:", error))
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  // Filter orders based on selected years
  const filteredOrders = React.useMemo(() => {
    if (selectedYears.length === 0) return orders;
    return orders.filter(o => selectedYears.includes(new Date(o.fechaProgramada).getFullYear().toString()));
  }, [orders, selectedYears]);

  const availableYears = React.useMemo(() => {
    return [...new Set(orders.map(o => new Date(o.fechaProgramada).getFullYear().toString()))]
            .sort((a, b) => Number(b) - Number(a));
  }, [orders]);

  const yearOptions: ComboboxOption[] = availableYears.map(year => ({
    value: year,
    label: year,
  }));
  
  const currentPeriodTotals = React.useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const totalCurrentYear = orders.filter(o => {
        const orderDate = new Date(o.fechaProgramada);
        return orderDate.getFullYear() === currentYear;
    }).length;

    const totalCurrentMonth = orders.filter(o => {
        const orderDate = new Date(o.fechaProgramada);
        return orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth;
    }).length;

    return { totalCurrentYear, totalCurrentMonth };
  }, [orders]);

  // --- Chart Data Calculations ---

  const monthlyInstallations = React.useMemo(() => {
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const dataByMonth: { month: string; [year: string]: number | string }[] = months.map(m => ({ month: m.charAt(0).toUpperCase() + m.slice(1) }));

    filteredOrders.forEach(order => {
        const date = new Date(order.fechaProgramada);
        const year = date.getFullYear().toString();
        
        const monthIndex = date.getMonth();
        const monthName = months[monthIndex].charAt(0).toUpperCase() + months[monthIndex].slice(1);
        
        const monthEntry = dataByMonth.find(d => d.month === monthName);
        if (monthEntry) {
            if (!monthEntry[year]) monthEntry[year] = 0;
            (monthEntry[year] as number)++;
        }
    });
    
    dataByMonth.forEach(monthEntry => {
        selectedYears.forEach(year => {
            if (!monthEntry[year]) {
                monthEntry[year] = 0;
            }
        });
    });

    return dataByMonth;
  }, [filteredOrders, selectedYears]);

  const installationsByVehicle = React.useMemo(() => {
    const counts = filteredOrders.reduce((acc, order) => {
        const vehicle = order.tipoVehiculo || 'desconocido';
        acc[vehicle] = (acc[vehicle] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [filteredOrders]);
  
  const installationsByPlan = React.useMemo(() => {
    const counts = filteredOrders.reduce((acc, order) => {
        const plan = order.tipoPlan || 'desconocido';
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

  const installationsBySegment = React.useMemo(() => {
    const counts = filteredOrders.reduce((acc, order) => {
        const segment = order.segmento || 'desconocido';
        acc[segment] = (acc[segment] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [filteredOrders]);
  
  const annualInstallations = React.useMemo(() => {
    const counts = filteredOrders.reduce((acc, order) => {
        const year = new Date(order.fechaProgramada).getFullYear().toString();
        acc[year] = (acc[year] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, total]) => ({ name, total })).sort((a, b) => Number(a.name) - Number(b.name));
  }, [filteredOrders]);

  const installationsByCity = React.useMemo(() => {
    const counts = filteredOrders.reduce((acc, order) => {
        const city = order.ciudad || 'Desconocida';
        acc[city] = (acc[city] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sortedCities = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (sortedCities.length <= 10) {
      return sortedCities;
    }

    const top10 = sortedCities.slice(0, 10);
    const othersCount = sortedCities.slice(10).reduce((sum, city) => sum + city.value, 0);

    if (othersCount > 0) {
        return [
            ...top10,
            { name: 'Otras', value: othersCount },
        ];
    }
    
    return top10;
  }, [filteredOrders]);
  
  const installationsByTechnician = React.useMemo(() => {
      const counts = filteredOrders.reduce((acc, order) => {
          const tech = order.tecnicoNombre || 'No Asignado';
          acc[tech] = (acc[tech] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);
      return Object.entries(counts).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [filteredOrders]);


  if (isLoading) {
    return (
        <>
            <Header title="Reportes y Estadísticas" />
            <div className="p-4 md:p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
                <Skeleton className="h-80 w-full" />
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                  <Skeleton className="h-80 w-full" />
                   <Skeleton className="h-80 w-full" />
                </div>
            </div>
        </>
    );
  }
  
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9c", "#ffc658", "#fa8072", "#7ce38c", "#a4de6c", "#d0ed57"];

  const renderHorizontalBarChart = (chartData: {name: string, total: number}[], title: string, dataKey: string = "total") => (
     <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={80} interval={0} />
                    <Tooltip
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
                        <LabelList dataKey={dataKey} position="right" className="fill-foreground" fontSize={12} />
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  );

  const renderVerticalBarChart = (chartData: {name: string, total: number}[], title: string) => (
    <Card>
       <CardHeader>
           <CardTitle>{title}</CardTitle>
       </CardHeader>
       <CardContent className="pl-2">
           <ResponsiveContainer width="100%" height={350}>
               <BarChart data={chartData} margin={{ top: 20 }}>
                   <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                   <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                   <Tooltip
                        cursor={{fill: 'transparent'}}
                       contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                   />
                   <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="total" position="top" className="fill-foreground" fontSize={12} />
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                   </Bar>
               </BarChart>
           </ResponsiveContainer>
       </CardContent>
   </Card>
 );

 const renderPieChart = (
    chartData: {name: string, value: number}[],
    title: string
  ) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] w-full flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
 };

  const lineColors = ["#8884d8", "#82ca9c", "#ffc658", "#ff8042"];

  return (
    <>
      <Header title="Reporte de Instalaciones" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Dashboard de Instalaciones</h2>
            <div className="w-72">
                <MultiSelectCombobox
                    options={yearOptions}
                    selected={selectedYears}
                    onChange={setSelectedYears}
                    placeholder="Seleccione año(s)..."
                    searchPlaceholder="Buscar año..."
                    emptyPlaceholder="No hay años disponibles"
                />
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Instalaciones</CardTitle>
                    <HardHat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredOrders.length}</div>
                    <p className="text-xs text-muted-foreground">
                        {selectedYears.length > 0 ? `Para los años: ${selectedYears.join(', ')}` : 'De todos los años'}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total (Año Actual)</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{currentPeriodTotals.totalCurrentYear}</div>
                    <p className="text-xs text-muted-foreground">
                        Instalaciones en {new Date().getFullYear()}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total (Mes Actual)</CardTitle>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{currentPeriodTotals.totalCurrentMonth}</div>
                    <p className="text-xs text-muted-foreground">
                        Instalaciones en {format(new Date(), 'LLLL', { locale: es })}
                    </p>
                </CardContent>
            </Card>
        </div>
        
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Instalaciones Mensuales</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={monthlyInstallations}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                        <Legend />
                        {selectedYears.map((year, index) => (
                            <Line key={year} type="monotone" dataKey={year} stroke={lineColors[index % lineColors.length]} activeDot={{ r: 8 }} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {renderHorizontalBarChart(installationsByVehicle, "Instalaciones por Vehículo")}
            {renderHorizontalBarChart(installationsByPlan, "Instalaciones por Tipo de Plan")}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {renderHorizontalBarChart(installationsBySegment, "Instalaciones por Segmento")}
            {renderHorizontalBarChart(installationsByTechnician, "Instalaciones por Técnico")}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {renderVerticalBarChart(annualInstallations, "Instalaciones Anuales")}
            {renderPieChart(installationsByCity, "Instalaciones por Ciudad")}
        </div>
      </div>
    </>
  );
}

export default function ReportsPage() {
    return (
        <AppContent>
            <InstallationReportsDashboard />
        </AppContent>
    )
}

    