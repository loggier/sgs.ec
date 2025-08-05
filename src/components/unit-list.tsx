
'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, CreditCard, Link2, Power, PowerOff } from 'lucide-react';
import { format, startOfDay, isSameDay, isThisWeek, isThisMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

import type { Unit } from '@/lib/unit-schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useAuth } from '@/context/auth-context';
import type { DisplayUnit } from '@/app/clients/[clientId]/units/page';

import UnitForm from './unit-form';
import DeleteUnitDialog from './delete-unit-dialog';
import PaymentForm from './payment-form';
import PaymentStatusBadge from './payment-status-badge';
import UnitFilterControls from './unit-filter-controls';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import SetWoxStatusDialog from './set-wox-status-dialog';

type UnitListProps = {
  initialUnits: DisplayUnit[];
  clientId: string;
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

const badgeVariants = {
    info: 'bg-blue-100 text-blue-800 border-blue-200',
};

function formatCurrency(amount?: number | null) {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDateSafe(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        return format(d, 'P', { locale: es });
    } catch (error) {
        return 'Fecha inválida';
    }
}

export default function UnitList({ initialUnits, clientId, onDataChange }: UnitListProps) {
  const { user } = useAuth();
  const [units, setUnits] = React.useState<DisplayUnit[]>(initialUnits);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [isWoxStatusDialogOpen, setIsWoxStatusDialogOpen] = React.useState(false);
  const [selectedUnit, setSelectedUnit] = React.useState<DisplayUnit | null>(null);

  const [filter, setFilter] = React.useState('all');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  React.useEffect(() => {
    setUnits(initialUnits);
  }, [initialUnits]);

  const filteredUnits = React.useMemo(() => {
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
  
  const handleAddUnit = () => {
    setSelectedUnit(null);
    setIsSheetOpen(true);
  };

  const handleEditUnit = (unit: DisplayUnit) => {
    setSelectedUnit(unit);
    setIsSheetOpen(true);
  };

  const handleDeleteUnit = (unit: DisplayUnit) => {
    setSelectedUnit(unit);
    setIsDeleteDialogOpen(true);
  };
  
  const handleRegisterPayment = (unit: DisplayUnit) => {
    setSelectedUnit(unit);
    setIsPaymentDialogOpen(true);
  };

  const handleSetWoxStatus = (unit: DisplayUnit) => {
    setSelectedUnit(unit);
    setIsWoxStatusDialogOpen(true);
  };

  const handleSuccess = () => {
    onDataChange();
    setIsSheetOpen(false);
    setIsPaymentDialogOpen(false);
    setIsDeleteDialogOpen(false);
    setIsWoxStatusDialogOpen(false);
    setSelectedUnit(null);
  };
  
  const needsConfiguration = (unit: DisplayUnit) => {
    if (unit.tipoContrato === 'con_contrato') {
      return !unit.costoTotalContrato || unit.costoTotalContrato === 0;
    }
    return !unit.costoMensual || unit.costoMensual === 0;
  };

  const getCostForUnit = (unit: DisplayUnit) => {
    const isUnconfigured = needsConfiguration(unit);

    if (unit.tipoContrato === 'con_contrato') {
      const monthlyCost = (unit.costoTotalContrato ?? 0) / (unit.mesesContrato ?? 1);
      const balance = unit.saldoContrato ?? unit.costoTotalContrato;
      return (
        <div>
          <div className={cn("font-medium", isUnconfigured && "text-destructive")} title="Costo Total Contrato">{formatCurrency(unit.costoTotalContrato)}</div>
          <div className="text-xs text-muted-foreground" title="Cuota Mensual">
            {formatCurrency(monthlyCost)}/mes
          </div>
          <div className="text-xs text-blue-600 font-semibold" title="Saldo Pendiente">
            Saldo: {formatCurrency(balance)}
          </div>
        </div>
      );
    }
    return <div className={cn("font-medium", isUnconfigured && "text-destructive")}>{formatCurrency(unit.costoMensual)}</div>;
  };
  
  const getContractDisplay = (unit: DisplayUnit) => {
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
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>Unidades del Cliente</CardTitle>
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
        <TooltipProvider>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Fecha de Instalación</TableHead>
                <TableHead>Fecha de Suspensión</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Tipo de Plan</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Próximo Pago</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.length > 0 ? (
                filteredUnits.map(unit => {
                  const isUnconfigured = needsConfiguration(unit);
                  return (
                  <TableRow key={unit.id} className={cn(
                      isExpired(unit.fechaVencimiento) && 'bg-red-50 dark:bg-red-900/20',
                      isUnconfigured && 'bg-yellow-50 dark:bg-yellow-900/20'
                  )}>
                    <TableCell>
                        <div className="font-medium flex items-center gap-2">
                            {unit.placa}
                            {unit.woxDeviceId && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className={cn(badgeVariants.info, unit.woxDeviceActive ? 'border-green-400' : 'border-red-400')}>
                                            <Link2 className={cn("h-3 w-3", unit.woxDeviceActive ? 'text-green-600' : 'text-red-600')}/>
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Vinculado a WOX (ID: {unit.woxDeviceId}) - {unit.woxDeviceActive ? 'Activo' : 'Inactivo'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </TableCell>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Alternar menú</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleRegisterPayment(unit)} disabled={isUnconfigured}>
                            <CreditCard className="mr-2 h-4 w-4" /> Registrar Pago
                          </DropdownMenuItem>
                          {user && ['master', 'manager', 'analista'].includes(user.role) && (
                            <>
                              <DropdownMenuSeparator />
                              {unit.woxDeviceId && (
                                <DropdownMenuItem onClick={() => handleSetWoxStatus(unit)} className={!unit.woxDeviceActive ? "text-green-600 focus:text-green-600" : "text-red-600 focus:text-red-600"}>
                                    {!unit.woxDeviceActive ? <Power className="mr-2 h-4 w-4" /> : <PowerOff className="mr-2 h-4 w-4" />}
                                    {!unit.woxDeviceActive ? 'Activar en WOX' : 'Desactivar en WOX'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleEditUnit(unit)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteUnit(unit)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    No hay unidades que coincidan con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </TooltipProvider>
      </CardContent>
      </Card>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl w-full">
          <SheetHeader>
            <SheetTitle>{selectedUnit ? 'Editar Unidad' : 'Agregar Nueva Unidad'}</SheetTitle>
          </SheetHeader>
          <UnitForm
            unit={selectedUnit}
            clientId={clientId}
            onSave={handleSuccess}
            onCancel={() => setIsSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <DeleteUnitDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        unit={selectedUnit}
        clientId={clientId}
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
      
      <SetWoxStatusDialog
          isOpen={isWoxStatusDialogOpen}
          onOpenChange={setIsWoxStatusDialogOpen}
          unit={selectedUnit}
          onSuccess={handleSuccess}
      />
    </>
  );
}
