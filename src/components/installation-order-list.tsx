
'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import type { InstallationOrder } from '@/lib/installation-order-schema';
import { useSearch } from '@/context/search-context';
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
} from '@/components/ui/dropdown-menu';
// import DeleteWorkOrderDialog from './delete-work-order-dialog';

type InstallationOrderListProps = {
  initialOrders: InstallationOrder[];
  onDataChange: () => void;
};

export default function InstallationOrderList({ initialOrders, onDataChange }: InstallationOrderListProps) {
  const { searchTerm } = useSearch();
  const { user: currentUser } = useAuth();
  const [orders, setOrders] = React.useState(initialOrders);
  // const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<InstallationOrder | null>(null);

  React.useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);
  
  const handleDeleteOrder = (order: InstallationOrder) => {
    setSelectedOrder(order);
    // setIsDeleteDialogOpen(true);
    alert('Delete functionality to be implemented');
  };

  const onOrderDeleted = () => {
    onDataChange();
    // setIsDeleteDialogOpen(false);
    setSelectedOrder(null);
  };

  const statusVariants: Record<InstallationOrder['estado'], 'default' | 'secondary' | 'outline'> = {
    pendiente: 'secondary',
    'en-curso': 'default',
    terminado: 'outline',
  };
  
  const formatDate = (date: Date | string) => {
      try {
        return format(new Date(date), "dd/MM/yyyy", { locale: es });
      } catch {
          return "Fecha inválida";
      }
  }


  const filteredOrders = React.useMemo(() => {
    if (!searchTerm) return orders;
    const lowercasedTerm = searchTerm.toLowerCase();
    return orders.filter(order =>
      order.nombreCliente.toLowerCase().includes(lowercasedTerm) ||
      order.placaVehiculo.toLowerCase().includes(lowercasedTerm) ||
      order.ciudad.toLowerCase().includes(lowercasedTerm) ||
      (order.tecnicoNombre && order.tecnicoNombre.toLowerCase().includes(lowercasedTerm))
    );
  }, [searchTerm, orders]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
                <CardTitle>Listado de Instalaciones</CardTitle>
                <CardDescription>Cree y gestione las tareas de instalación.</CardDescription>
            </div>
            {currentUser?.role !== 'tecnico' && (
                <Button asChild size="sm">
                  <Link href="/installations/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva Orden de Instalación
                  </Link>
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Fecha Programada</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">{order.nombreCliente}</div>
                        <div className="text-sm text-muted-foreground">{order.numeroCliente}</div>
                      </TableCell>
                       <TableCell>
                         <div className="font-medium">{order.placaVehiculo}</div>
                         <div className="text-sm text-muted-foreground">{order.ciudad}</div>
                       </TableCell>
                       <TableCell>{order.tecnicoNombre || 'No asignado'}</TableCell>
                      <TableCell>
                        <div>{formatDate(order.fechaProgramada)}</div>
                        <div className="text-sm text-muted-foreground">{order.horaProgramada}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{order.tipoPlan}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[order.estado]} className="capitalize">{order.estado.replace('-', ' ')}</Badge>
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
                                <DropdownMenuItem asChild>
                                  <Link href={`/installations/${order.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" /> Ver / Editar
                                  </Link>
                                </DropdownMenuItem>
                                {currentUser?.role !== 'tecnico' && (
                                    <DropdownMenuItem onClick={() => handleDeleteOrder(order)} className="text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                      No se encontraron órdenes de instalación.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* <DeleteWorkOrderDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        order={selectedOrder}
        onDelete={onOrderDeleted}
      /> */}
    </>
  );
}
