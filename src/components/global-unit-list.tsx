
'use client';

import * as React from 'react';
import { MoreHorizontal, Edit, Trash2, CreditCard, PlusCircle, Power, PowerOff } from 'lucide-react';
import { format, startOfDay, isSameDay, isThisWeek, isThisMonth, isWithinInterval, differenceInDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import Link from 'next/link';

import type { Unit } from '@/lib/unit-schema';
import { useAuth } from '@/context/auth-context';
import { useSearch } from '@/context/search-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import UnitForm from './unit-form';
import DeleteUnitDialog from './delete-unit-dialog';
import PaymentForm from './payment-form';
import PaymentStatusBadge from './payment-status-badge';
import UnitFilterControls from './unit-filter-controls';
import SetPgpsStatusDialog from './set-pgps-status-dialog';

type GlobalUnit = Unit & { clientName: string; ownerName?: string; };

type GlobalUnitListProps = {
  initialUnits: GlobalUnit[];
  onDataChange: () => void;
};

const planDisplayNames: Record<Unit['tipoPlan'], string> = {
  'estandar-sc': 'Estándar SC',
  'avanzado-sc': 'Avanzado SC',
  'total-sc': 'Total SC',
  'estandar-cc': 'Estándar CC',
  'avanzado-cc': 'Avanzado CC',
  'total-cc': 'Total CC',
};

function formatCurrency(amount?: number | null) {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDateSafe(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        // Check if date is valid
        if (isNaN(d.getTime())) return 'N/A';
        return format(d, 'P', { locale: es });
    } catch (error) {
        return 'Fecha inválida';
    }
}

export default function GlobalUnitList({ initialUnits, onDataChange }: GlobalUnitListProps) {
  const { user } = useAuth();
  const { searchTerm } = useSearch();
  const [units, setUnits] = React.useState(initialUnits);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [isPgpsStatusDialogOpen, setIsPgpsStatusDialogOpen] = React.useState(false);
  const [selectedUnit, setSelectedUnit] = React.useState<GlobalUnit | null>(null);

  const [filter, setFilter] = React.useState('all');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);
  
  React.useEffect(() => {
    setUnits(initialUnits);
  }, [initialUnits]);
  
  const handleAddUnit = () => {
    setSelectedUnit(null);
    setIsSheetOpen(true);
  };

  const handleEditUnit = (unit: GlobalUnit) => {
    setSelectedUnit(unit);
    setIsSheetOpen(true);
  };

  const handleDeleteUnit = (unit: GlobalUnit) => {
    setSelectedUnit(unit);
    setIsDeleteDialogOpen(true);
  };
  
  const handleRegisterPayment = (unit: GlobalUnit) => {
    setSelectedUnit(unit);
    setIsPaymentDialogOpen(true);
  };

  const handleSetPgpsStatus = (unit: GlobalUnit) => {
    setSelectedUnit(unit);
    setIsPgpsStatusDialogOpen(true);
  };

  const handleSuccess = () => {
    onDataChange();
    setIsSheetOpen(false);
    setIsPaymentDialogOpen(false);
    setIsDeleteDialogOpen(false);
    setIsPgpsStatusDialogOpen(false);
    setSelectedUnit(null);
  };
  
  const getCostForUnit = (unit: Unit) => {
    if (unit.tipoContrato === 'con_contrato') {
      const monthlyCost = (unit.costoTotalContrato ?? 0) / (unit.mesesContrato ?? 1);
      const balance = unit.saldoContrato ?? unit.costoTotalContrato;
      return (
        <div>
          <div className="font-medium" title="Costo Total Contrato">{formatCurrency(unit.costoTotalContrato)}</div>
          <div className="text-xs text-muted-foreground" title="Cuota Mensual">
            {formatCurrency(monthlyCost)}/mes
          </div>
          <div className="text-xs text-blue-600 font-semibold" title="Saldo Pendiente">
            Saldo: {formatCurrency(balance)}
          </div>
        </div>
      );
    }
    return <div className="font-medium">{formatCurrency(unit.costoMensual)}</div>;
  };

  const getMonthlyRate = (unit: Unit): number => {
    if (unit.tipoContrato === 'con_contrato') {
        return (unit.costoTotalContrato ?? 0) / (unit.mesesContrato || 1);
    }
    return unit.costoMensual ?? 0;
  };
  
  const calculateOverdueAmount = (unit: Unit): number => {
      const today = startOfDay(new Date());
      if (!unit.fechaSiguientePago) return 0;
      const nextPaymentDate = startOfDay(new Date(unit.fechaSiguientePago));

      if (isBefore(today, nextPaymentDate)) {
          return 0;
      }
      
      const daysOverdue = differenceInDays(today, nextPaymentDate);
      const monthlyRate = getMonthlyRate(unit);
      
      if (monthlyRate === 0) return 0;

      // Calculate how many full 30-day periods have passed
      const monthsOverdue = Math.floor(daysOverdue / 30) + 1;
      
      return monthsOverdue * monthlyRate;
  };
  
  const getContractDisplay = (unit: Unit) => {
    const baseText = unit.tipoContrato === 'con_contrato' ? 'Con Contrato' : 'Sin Contrato';
    const duration = unit.mesesContrato ? `${unit.mesesContrato} meses` : null;

    return (
      <div>
        <div className="font-medium">{baseText}</div>
        {duration && <div className="text-xs text-muted-foreground">{duration}</div>}
      </div>
    );
  };

  const isExpired = (date: Date) => {
    return new Date(date) < new Date();
  }
  
  const filteredUnitsByDate = React.useMemo(() => {
    const today = startOfDay(new Date());
    return units.filter(unit => {
      if (!unit.fechaSiguientePago) return false;
      const nextPaymentDate = startOfDay(new Date(unit.fechaSiguientePago));

      let match = false;
      switch (filter) {
        case 'overdue':
          match = nextPaymentDate < today;
          break;
        case 'today':
          match = isSameDay(nextPaymentDate, today);
          break;
        case 'week':
          match = isThisWeek(nextPaymentDate, { weekStartsOn: 1 });
          break;
        case 'month':
          match = isThisMonth(nextPaymentDate);
          break;
        case 'range':
          if (dateRange?.from && dateRange?.to) {
            match = isWithinInterval(nextPaymentDate, { start: startOfDay(dateRange.from), end: startOfDay(dateRange.to) });
          } else if (dateRange?.from) {
            match = isSameDay(nextPaymentDate, startOfDay(dateRange.from));
          }
          break;
        case 'all':
        default:
          match = true;
          break;
      }
      return match;
    });
  }, [units, filter, dateRange]);


  const filteredUnits = React.useMemo(() => {
    if (!searchTerm) return filteredUnitsByDate;
    const lowercasedTerm = searchTerm.toLowerCase();
    return filteredUnitsByDate.filter(unit =>
        unit.placa.toLowerCase().includes(lowercasedTerm) ||
        unit.imei.toLowerCase().includes(lowercasedTerm) ||
        unit.clientName.toLowerCase().includes(lowercasedTerm) ||
        (unit.ownerName && unit.ownerName.toLowerCase().includes(lowercasedTerm))
    );
  }, [searchTerm, filteredUnitsByDate]);

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <CardTitle>Inventario Global de Unidades</CardTitle>
                <CardDescription>Gestione todas las unidades de todos los clientes.</CardDescription>
            </div>
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <UnitFilterControls
                  filter={filter}
                  setFilter={setFilter}
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                />
                {user && ['master', 'manager'].includes(user.role) && (
                <Button onClick={handleAddUnit} size="sm" className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva Unidad
                </Button>
                )}
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Cliente</TableHead>
                {user?.role === 'master' && <TableHead>Propietario</TableHead>}
                <TableHead>IMEI</TableHead>
                <TableHead>Fecha de Instalación</TableHead>
                <TableHead>Fecha de Suspensión</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Tipo de Plan</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Estado de Pago</TableHead>
                <TableHead>Monto Vencido</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.length > 0 ? (
                filteredUnits.map(unit => (
                  <TableRow key={`${unit.clientId}-${unit.id}`} className={isExpired(unit.fechaVencimiento) ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                    <TableCell className="font-medium">{unit.placa}</TableCell>
                    <TableCell>
                      <Link href={`/clients/${unit.clientId}/units`} className="hover:underline text-primary">
                        {unit.clientName}
                      </Link>
                    </TableCell>
                    {user?.role === 'master' && <TableCell>{unit.ownerName}</TableCell>}
                    <TableCell>{unit.imei}</TableCell>
                    <TableCell>{formatDateSafe(unit.fechaInstalacion)}</TableCell>
                    <TableCell className={unit.fechaSuspension ? 'font-semibold text-destructive' : ''}>
                        {formatDateSafe(unit.fechaSuspension)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{planDisplayNames[unit.tipoPlan]}</Badge>
                    </TableCell>
                    <TableCell>
                      {getContractDisplay(unit)}
                    </TableCell>
                    <TableCell>
                      {getCostForUnit(unit)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge paymentDate={unit.fechaSiguientePago} />
                    </TableCell>
                    <TableCell>
                      {hasMounted ? formatCurrency(calculateOverdueAmount(unit)) : ''}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Alternar menú</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleRegisterPayment(unit)}>
                            <CreditCard className="mr-2 h-4 w-4" /> Registrar Pago
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {unit.pgpsDeviceId && (
                            <DropdownMenuItem onClick={() => handleSetPgpsStatus(unit)} className={!unit.pgpsDeviceActive ? "text-green-600 focus:text-green-600" : "text-red-600 focus:text-red-600"}>
                                {!unit.pgpsDeviceActive ? <Power className="mr-2 h-4 w-4" /> : <PowerOff className="mr-2 h-4 w-4" />}
                                {!unit.pgpsDeviceActive ? 'Activar en P. GPS' : 'Desactivar en P. GPS'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleEditUnit(unit)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteUnit(unit)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={user?.role === 'master' ? 12 : 11} className="text-center">
                    No hay unidades que coincidan con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      </Card>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl w-full">
          <SheetHeader>
            <SheetTitle>{selectedUnit ? 'Editar Unidad' : 'Agregar Nueva Unidad'}</SheetTitle>
          </SheetHeader>
           <UnitForm
              unit={selectedUnit}
              clientId={selectedUnit?.clientId} 
              onSave={handleSuccess}
              onCancel={() => setIsSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <DeleteUnitDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        unit={selectedUnit}
        clientId={selectedUnit?.clientId ?? ''}
        onDelete={handleSuccess}
      />
      
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Registrar Pago para {selectedUnit?.placa}</DialogTitle>
                  <DialogDescription>
                      Complete los detalles del pago. Al guardar, las fechas de la unidad se actualizarán automáticamente.
                  </DialogDescription>
              </DialogHeader>
              {selectedUnit && (
                  <PaymentForm 
                      unit={selectedUnit}
                      onSave={handleSuccess}
                      onCancel={() => setIsPaymentDialogOpen(false)}
                  />
              )}
          </DialogContent>
      </Dialog>
      
      <SetPgpsStatusDialog
          isOpen={isPgpsStatusDialogOpen}
          onOpenChange={setIsPgpsStatusDialogOpen}
          unit={selectedUnit}
          onSuccess={handleSuccess}
      />
    </>
  );
}
