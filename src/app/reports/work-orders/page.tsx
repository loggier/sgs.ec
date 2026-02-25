
'use client';

import * as React from 'react';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import { useAuth } from '@/context/auth-context';
import { getAllWorkOrders } from '@/lib/work-order-actions';
import { getUsers } from '@/lib/user-actions';
import type { User } from '@/lib/user-schema';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import type { WorkOrder } from '@/lib/work-order-schema';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Download, ListTodo, Wrench, CheckCircle } from 'lucide-react';
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
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function WorkOrderReportsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  
  const [selectedYears, setSelectedYears] = React.useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = React.useState<string[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = React.useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = React.useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([
          getAllWorkOrders(user),
          getUsers(user)
      ]).then(([data, allUsers]) => {
          const validData = data.filter(o => o.fechaProgramada && !isNaN(new Date(o.fechaProgramada).getTime()));
          setOrders(validData);
          setTechnicians(allUsers.filter(u => u.role === 'tecnico'));
          
          const years = [...new Set(validData.map(o => new Date(o.fechaProgramada).getFullYear().toString()))]
            .sort((a, b) => Number(b) - Number(a));
          if (years.length > 0) {
            setSelectedYears([years[0]]);
          }
        })
        .catch(error => console.error("Failed to fetch work orders:", error))
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  const filteredOrders = React.useMemo(() => {
    return orders.filter(o => {
        const orderDate = new Date(o.fechaProgramada);
        const year = orderDate.getFullYear().toString();
        const month = (orderDate.getMonth() + 1).toString();

        const yearMatch = selectedYears.length === 0 || selectedYears.includes(year);
        const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(month);
        const techMatch = selectedTechnicians.length === 0 || (o.tecnicoId && selectedTechnicians.includes(o.tecnicoId));
        const priorityMatch = selectedPriorities.length === 0 || selectedPriorities.includes(o.prioridad);
        const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(o.estado);

        return yearMatch && monthMatch && techMatch && priorityMatch && statusMatch;
    });
  }, [orders, selectedYears, selectedMonths, selectedTechnicians, selectedPriorities, selectedStatuses]);

  const yearOptions: ComboboxOption[] = [...new Set(orders.map(o => new Date(o.fechaProgramada).getFullYear().toString()))]
            .sort((a, b) => Number(b) - Number(a))
            .map(year => ({ value: year, label: year }));
  
  const monthOptions: ComboboxOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2000, i), 'LLLL', { locale: es }).replace(/^\w/, c => c.toUpperCase()),
  }));
  
  const technicianOptions: ComboboxOption[] = technicians.map(tech => ({
      value: tech.id,
      label: tech.nombre || tech.username,
  }));

  const priorityOptions: ComboboxOption[] = [{value: 'alta', label: 'Alta'}, {value: 'media', label: 'Media'}, {value: 'baja', label: 'Baja'}];
  const statusOptions: ComboboxOption[] = [{value: 'pendiente', label: 'Pendiente'}, {value: 'en-progreso', label: 'En Progreso'}, {value: 'completada', label: 'Completada'}];


  const summaryData = React.useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
        acc.total++;
        if (order.estado === 'pendiente') acc.pending++;
        if (order.estado === 'en-progreso') acc.inProgress++;
        if (order.estado === 'completada') acc.completed++;
        return acc;
    }, { total: 0, pending: 0, inProgress: 0, completed: 0});
  }, [filteredOrders]);

  const monthlyData = React.useMemo(() => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const dataByMonth: { month: string; [year: string]: number | string }[] = months.map(m => ({ month: m }));

    filteredOrders.forEach(order => {
        const date = new Date(order.fechaProgramada);
        const year = date.getFullYear().toString();
        const monthIndex = date.getMonth();
        
        const monthEntry = dataByMonth[monthIndex];
        if (monthEntry) {
            if (!monthEntry[year]) monthEntry[year] = 0;
            (monthEntry[year] as number)++;
        }
    });

    selectedYears.forEach(year => {
      dataByMonth.forEach(monthEntry => {
        if (!monthEntry[year]) monthEntry[year] = 0;
      });
    });

    return dataByMonth;
  }, [filteredOrders, selectedYears]);

  const ordersByTechnician = React.useMemo(() => {
      const counts = filteredOrders.reduce((acc, order) => {
          const tech = order.tecnicoNombre || 'No Asignado';
          acc[tech] = (acc[tech] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);
      return Object.entries(counts).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [filteredOrders]);
  
  const ordersByPriority = React.useMemo(() => {
      const counts = filteredOrders.reduce((acc, order) => {
          const priority = order.prioridad;
          acc[priority] = (acc[priority] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);
      return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredOrders]);

  const ordersByStatus = React.useMemo(() => {
      const counts = filteredOrders.reduce((acc, order) => {
          const status = order.estado;
          acc[status] = (acc[status] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);
      return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredOrders]);


  const handleExport = () => {
    if (!filteredOrders.length) {
        toast({ title: 'No hay datos para exportar', variant: 'destructive' });
        return;
    }
    setIsExporting(true);
    try {
        const dataToExport = filteredOrders.map(order => ({
            'ID Orden': order.id,
            'Estado': order.estado,
            'Prioridad': order.prioridad,
            'Fecha Programada': format(new Date(order.fechaProgramada), 'yyyy-MM-dd'),
            'Hora Programada': order.horaProgramada,
            'Cliente': order.nombreCliente,
            'Placa': order.placaVehiculo,
            'Ciudad': order.ciudad,
            'Técnico': order.tecnicoNombre || 'No Asignado',
            'Descripción': order.descripcion,
            'Observación Técnico': order.observacion,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte de Soporte');
        XLSX.writeFile(workbook, `Reporte_Soporte_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast({ title: 'Exportación completada' });
    } catch (error) {
        toast({ title: 'Error de exportación', variant: 'destructive' });
    } finally {
        setIsExporting(false);
    }
  };


  if (isLoading) {
    return (
        <>
            <Header title="Reporte de Órdenes de Soporte" showBackButton backButtonHref="/reports" />
            <div className="p-4 md:p-6 space-y-6">
                 <Skeleton className="h-8 w-full" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
                <Skeleton className="h-80 w-full" />
            </div>
        </>
    );
  }
  
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];
  const lineColors = ["#8884d8", "#82ca9c", "#ffc658", "#ff8042"];


  return (
    <>
      <Header title="Reporte de Órdenes de Soporte" showBackButton backButtonHref="/reports" />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h2 className="text-2xl font-bold">Dashboard de Soporte</h2>
            <div className="flex flex-wrap items-center gap-2">
                <MultiSelectCombobox options={yearOptions} selected={selectedYears} onChange={setSelectedYears} placeholder="Año(s)..." className="w-full sm:w-auto md:w-[120px]" />
                <MultiSelectCombobox options={monthOptions} selected={selectedMonths} onChange={setSelectedMonths} placeholder="Mes(es)..." className="w-full sm:w-auto md:w-[150px]" />
                <MultiSelectCombobox options={technicianOptions} selected={selectedTechnicians} onChange={setSelectedTechnicians} placeholder="Técnico(s)..." className="w-full sm:w-auto md:w-[180px]" />
                <MultiSelectCombobox options={priorityOptions} selected={selectedPriorities} onChange={setSelectedPriorities} placeholder="Prioridad..." className="w-full sm:w-auto md:w-[150px]" />
                <MultiSelectCombobox options={statusOptions} selected={selectedStatuses} onChange={setSelectedStatuses} placeholder="Estado..." className="w-full sm:w-auto md:w-[150px]" />
                <Button onClick={handleExport} disabled={isExporting || isLoading} size="sm" variant="outline" className="w-full sm:w-auto">
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                    Exportar
                </Button>
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Órdenes</CardTitle><Wrench className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{summaryData.total}</div><p className="text-xs text-muted-foreground">Para los filtros seleccionados</p></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pendientes</CardTitle><ListTodo className="h-4 w-4 text-yellow-500" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{summaryData.pending}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">En Progreso</CardTitle><Loader2 className="h-4 w-4 text-blue-500 animate-spin" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{summaryData.inProgress}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Completadas</CardTitle><CheckCircle className="h-4 w-4 text-green-500" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{summaryData.completed}</div></CardContent>
            </Card>
        </div>
        
        <Card>
            <CardHeader><CardTitle>Órdenes de Soporte Mensuales</CardTitle></CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                        <Legend />
                        {selectedYears.map((year, index) => (
                            <Line key={year} type="monotone" dataKey={year} stroke={lineColors[index % lineColors.length]} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <Card>
                <CardHeader><CardTitle>Órdenes por Técnico</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={ordersByTechnician} layout="vertical" margin={{ left: 20 }}>
                            <XAxis type="number" stroke="#888888" fontSize={12} />
                            <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} width={80} interval={0} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                                {ordersByTechnician.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
             <Card>
                <CardHeader><CardTitle>Órdenes por Prioridad</CardTitle></CardHeader>
                <CardContent className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={ordersByPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {ordersByPriority.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Órdenes por Estado</CardTitle></CardHeader>
                <CardContent className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name.replace('-', ' ')} ${(percent * 100).toFixed(0)}%`}>
                                {ordersByStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}

export default function WorkOrdersReportsPage() {
    return (
        <AppContent>
            <WorkOrderReportsDashboard />
        </AppContent>
    )
}
