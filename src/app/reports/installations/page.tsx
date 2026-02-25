
'use client';

import * as React from 'react';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import { useAuth } from '@/context/auth-context';
import { getInstallationOrders } from '@/lib/installation-order-actions';
import { getUsers } from '@/lib/user-actions';
import type { User } from '@/lib/user-schema';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import type { InstallationOrder } from '@/lib/installation-order-schema';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, HardHat, Calendar, CalendarDays, Download, CircleDollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<InstallationOrder[]>([]);
  const [technicians, setTechnicians] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  
  const [selectedYears, setSelectedYears] = React.useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = React.useState<string[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([
          getInstallationOrders(user),
          getUsers(user)
      ]).then(([data, allUsers]) => {
          const validData = data.filter(o => o.fechaProgramada && !isNaN(new Date(o.fechaProgramada).getTime()));
          setOrders(validData);
          setTechnicians(allUsers.filter(u => u.role === 'tecnico'));
          
          const years = [...new Set(validData.map(o => new Date(o.fechaProgramada).getFullYear().toString()))]
            .sort((a, b) => Number(b) - Number(a));
          setSelectedYears(years.slice(0, 1));
        })
        .catch(error => console.error("Failed to fetch installation orders:", error))
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  // Filter orders based on selected years, months, and technicians
  const filteredOrders = React.useMemo(() => {
    return orders.filter(o => {
        const orderDate = new Date(o.fechaProgramada);
        const year = orderDate.getFullYear().toString();
        const month = (orderDate.getMonth() + 1).toString(); // 1-12
        const technicianId = o.tecnicoId;

        const yearMatch = selectedYears.length === 0 || selectedYears.includes(year);
        const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(month);
        const techMatch = selectedTechnicians.length === 0 || (technicianId && selectedTechnicians.includes(technicianId));

        return yearMatch && monthMatch && techMatch;
    });
  }, [orders, selectedYears, selectedMonths, selectedTechnicians]);

  const availableYears = React.useMemo(() => {
    return [...new Set(orders.map(o => new Date(o.fechaProgramada).getFullYear().toString()))]
            .sort((a, b) => Number(b) - Number(a));
  }, [orders]);

  const yearOptions: ComboboxOption[] = availableYears.map(year => ({ value: year, label: year }));
  
  const monthOptions: ComboboxOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2000, i), 'LLLL', { locale: es }).replace(/^\w/, c => c.toUpperCase()),
  }));
  
  const technicianOptions: ComboboxOption[] = technicians.map(tech => ({
      value: tech.id,
      label: tech.nombre || tech.username,
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
  
  const totalEfectivo = React.useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      if (order.metodoPago === 'efectivo' && order.montoEfectivo) {
        return acc + order.montoEfectivo;
      }
      return acc;
    }, 0);
  }, [filteredOrders]);


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

  const handleExport = () => {
    if (!filteredOrders.length) {
        toast({
            title: 'No hay datos para exportar',
            description: 'Ajuste los filtros para generar un reporte.',
            variant: 'destructive',
        });
        return;
    }
    setIsExporting(true);
    try {
        const dataToExport = filteredOrders.map(order => {
            return {
                'ID Orden': order.id,
                'Estado': order.estado,
                'Fecha Programada': format(new Date(order.fechaProgramada), 'yyyy-MM-dd'),
                'Hora Programada': order.horaProgramada,
                'Cliente': order.nombreCliente,
                'Placa': order.placaVehiculo,
                'Ciudad': order.ciudad,
                'Técnico': order.tecnicoNombre || 'No Asignado',
                'Plan': order.tipoPlan,
                'Categoría': order.categoriaInstalacion,
                'Tipo Vehículo': order.tipoVehiculo,
                'Segmento': order.segmento,
                'Método Pago': order.metodoPago || 'N/A',
                'Monto Efectivo': order.metodoPago === 'efectivo' ? order.montoEfectivo : 'N/A',
                'Corte de Motor': order.corteDeMotor ? 'Sí' : 'No',
                'Lugar de Corte': order.lugarCorteMotor || 'N/A',
                'Observación Técnico': order.observacion,
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte de Instalaciones');
        XLSX.writeFile(workbook, `Reporte_Instalaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast({
            title: 'Exportación completada',
            description: 'El reporte de instalaciones ha sido descargado.',
        });
    } catch (error) {
        console.error("Error exporting data:", error);
        toast({
            title: 'Error de exportación',
            description: 'No se pudo generar el archivo de Excel.',
            variant: 'destructive',
        });
    } finally {
        setIsExporting(false);
    }
  };


  if (isLoading) {
    return (
        <>
            <Header title="Reportes y Estadísticas" showBackButton backButtonHref="/reports" />
            <div className="p-4 md:p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Skeleton className="h-28 w-full" />
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
      <Header title="Reporte de Instalaciones" showBackButton backButtonHref="/reports" />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h2 className="text-2xl font-bold">Dashboard de Instalaciones</h2>
            <div className="flex flex-wrap items-center gap-2">
                <MultiSelectCombobox
                    options={yearOptions}
                    selected={selectedYears}
                    onChange={setSelectedYears}
                    placeholder="Año(s)..."
                    searchPlaceholder="Buscar año..."
                    emptyPlaceholder="No hay años"
                    className="w-full sm:w-auto md:w-[150px]"
                />
                 <MultiSelectCombobox
                    options={monthOptions}
                    selected={selectedMonths}
                    onChange={setSelectedMonths}
                    placeholder="Mes(es)..."
                    searchPlaceholder="Buscar mes..."
                    emptyPlaceholder="No hay meses"
                    className="w-full sm:w-auto md:w-[180px]"
                />
                 <MultiSelectCombobox
                    options={technicianOptions}
                    selected={selectedTechnicians}
                    onChange={setSelectedTechnicians}
                    placeholder="Técnico(s)..."
                    searchPlaceholder="Buscar técnico..."
                    emptyPlaceholder="No hay técnicos"
                    className="w-full sm:w-auto md:w-[200px]"
                />
                <Button onClick={handleExport} disabled={isExporting || isLoading} size="sm" variant="outline" className="w-full sm:w-auto">
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                    Exportar a Excel
                </Button>
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Instalaciones</CardTitle>
                    <HardHat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredOrders.length}</div>
                    <p className="text-xs text-muted-foreground">
                        Para los filtros seleccionados
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
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Efectivo</CardTitle>
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(totalEfectivo)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Para los filtros seleccionados
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
