'use client';

import * as React from 'react';
import { MoreHorizontal, Edit, Trash2, CreditCard, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import type { Unit } from '@/lib/unit-schema';
import { useAuth } from '@/context/auth-context';
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
import { Input } from '@/components/ui/input';

import UnitForm from './unit-form';
import DeleteUnitDialog from './delete-unit-dialog';
import PaymentForm from './payment-form';

type GlobalUnit = Unit & { clientName: string; ownerName?: string; };

type GlobalUnitListProps = {
  initialUnits: GlobalUnit[];
};

const planDisplayNames: Record<Unit['tipoPlan'], string> = {
  'estandar-sc': 'Estándar SC',
  'avanzado-sc': 'Avanzado SC',
  'total-sc': 'Total SC',
  'estandar-cc': 'Estándar CC',
  'avanzado-cc': 'Avanzado CC',
  'total-cc': 'Total CC',
};

function formatCurrency(amount?: number) {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function GlobalUnitList({ initialUnits }: GlobalUnitListProps) {
  const { user } = useAuth();
  const [units, setUnits] = React.useState(initialUnits);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [selectedUnit, setSelectedUnit] = React.useState<GlobalUnit | null>(null);

  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);
  
  React.useEffect(() => {
    setUnits(initialUnits);
  }, [initialUnits]);

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

  const handleFormSave = (savedUnit: Unit) => {
    setUnits(currentUnits => {
        const clientName = currentUnits.find(u => u.clientId === savedUnit.clientId)?.clientName || 'N/A';
        const ownerName = currentUnits.find(u => u.clientId === savedUnit.clientId)?.ownerName || user?.nombre;
        const newSavedUnit = { ...savedUnit, clientName, ownerName };
        const existing = currentUnits.find(u => u.id === savedUnit.id);
        if (existing) {
            return currentUnits.map(u => u.id === savedUnit.id ? newSavedUnit : u);
        }
        return [...currentUnits, newSavedUnit];
    });
    setIsSheetOpen(false);
    setIsPaymentDialogOpen(false);
    setSelectedUnit(null);
  };
  
  const onUnitDeleted = (unitId: string) => {
    setUnits(currentUnits => currentUnits.filter(u => u.id !== unitId));
    setIsDeleteDialogOpen(false);
  };

  const getCostForUnit = (unit: Unit) => {
    if (unit.tipoContrato === 'con_contrato') {
        const monthly = (unit.costoTotalContrato ?? 0) / (unit.mesesContrato ?? 1);
        return (
            <div>
                <div className="font-medium">{formatCurrency(unit.costoTotalContrato)}</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(monthly)}/mes</div>
            </div>
        );
    }
    return <div className="font-medium">{formatCurrency(unit.costoMensual)}</div>;
  };

  const isExpired = (date: Date) => {
    return new Date(date) < new Date();
  }
  
  const filteredUnits = React.useMemo(() => {
    if (!searchTerm) return units;
    const lowercasedTerm = searchTerm.toLowerCase();
    return units.filter(unit =>
        unit.placa.toLowerCase().includes(lowercasedTerm) ||
        unit.imei.toLowerCase().includes(lowercasedTerm) ||
        unit.clientName.toLowerCase().includes(lowercasedTerm) ||
        (unit.ownerName && unit.ownerName.toLowerCase().includes(lowercasedTerm))
    );
  }, [searchTerm, units]);

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Inventario Global de Unidades</CardTitle>
                <CardDescription>Busque y gestione todas las unidades de todos los clientes.</CardDescription>
            </div>
        </div>
         <div className="relative mt-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por placa, IMEI, cliente, propietario..."
                className="w-full rounded-lg bg-background pl-8 md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                <TableHead>Plan</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.length > 0 ? (
                filteredUnits.map(unit => (
                  <TableRow key={unit.id} className={isExpired(unit.fechaVencimiento) ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                    <TableCell className="font-medium">{unit.placa}</TableCell>
                    <TableCell>
                      <Link href={`/clients/${unit.clientId}/units`} className="hover:underline text-primary">
                        {unit.clientName}
                      </Link>
                    </TableCell>
                    {user?.role === 'master' && <TableCell>{unit.ownerName}</TableCell>}
                    <TableCell>{unit.imei}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{planDisplayNames[unit.tipoPlan]}</Badge>
                    </TableCell>
                    <TableCell>
                       <Badge variant={unit.tipoContrato === 'con_contrato' ? 'default' : 'secondary'} className="capitalize">
                            {unit.tipoContrato === 'con_contrato' ? 'Con Contrato' : 'Sin Contrato'}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      {getCostForUnit(unit)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{hasMounted ? format(new Date(unit.fechaVencimiento), 'P', { locale: es }) : ''}</span>
                        {isExpired(unit.fechaVencimiento) && <span className="text-xs text-red-600">Vencido</span>}
                      </div>
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
                  <TableCell colSpan={user?.role === 'master' ? 9 : 8} className="text-center">
                    No se encontraron unidades.
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
          {selectedUnit && (
             <UnitForm
                unit={selectedUnit}
                clientId={selectedUnit.clientId}
                onSave={handleFormSave}
                onCancel={() => setIsSheetOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      <DeleteUnitDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        unit={selectedUnit}
        clientId={selectedUnit?.clientId ?? ''}
        onDelete={() => onUnitDeleted(selectedUnit!.id)}
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
                      onSave={handleFormSave}
                      onCancel={() => setIsPaymentDialogOpen(false)}
                  />
              )}
          </DialogContent>
      </Dialog>
    </>
  );
}
