

'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import type { WorkOrder } from '@/lib/work-order-schema';
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
import DeleteWorkOrderDialog from './delete-work-order-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteWorkOrder } from '@/lib/work-order-actions';


type WorkOrderListProps = {
  initialOrders: WorkOrder[];
  onDataChange: () => void;
};

export default function WorkOrderList({ initialOrders, onDataChange }: WorkOrderListProps) {
  const { searchTerm } = useSearch();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = React.useState(initialOrders);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<WorkOrder | null>(null);

  React.useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);
  
  const handleOpenDeleteDialog = (order: WorkOrder) => {
    setSelectedOrder(order);
    setIsDeleteDialogOpen(true);
  };

  const onDeletionConfirmed = async () => {
    if (!selectedOrder || !currentUser) return;
    
    const result = await deleteWorkOrder(selectedOrder.id, currentUser);
    
    if (result.success) {
        toast({ title: 'Éxito', description: result.message });
        setIsDeleteDialogOpen(false);
        onDataChange();
    } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
        setIsDeleteDialogOpen(false);
    }
  };

  const priorityVariants: Record<WorkOrder['prioridad'], 'destructive' | 'default' | 'secondary'> = {
    alta: 'destructive',
    media: 'default',
    baja: 'secondary',
  };
  const statusVariants: Record<WorkOrder['estado'], 'default' | 'secondary' | 'outline'> = {
    pendiente: 'secondary',
    'en-progreso': 'default',
    completada: 'outline',
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
  
  const OrderActions = ({ order }: { order: WorkOrder }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Alternar menú</span>
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
                <Link href={`/work-orders/${order.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Ver / Editar
                </Link>
            </DropdownMenuItem>
            {currentUser?.role !== 'tecnico' && (
                <DropdownMenuItem onClick={() => handleOpenDeleteDialog(order)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
            )}
        </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
                <CardTitle>Listado de Órdenes de Soporte</CardTitle>
                <CardDescription>Cree y gestione las tareas asignadas.</CardDescription>
            </div>
            {currentUser?.role !== 'tecnico' && (
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link href="/work-orders/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva Orden
                  </Link>
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
           <div className="md:hidden space-y-4">
                {filteredOrders.length > 0 ? filteredOrders.map(order => (
                    <Card key={order.id} className="w-full">
                        <CardHeader>
                             <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{order.nombreCliente}</CardTitle>
                                    <CardDescription>{order.placaVehiculo} - {order.ciudad}</CardDescription>
                                </div>
                                <OrderActions order={order} />
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                             <div className="flex items-center gap-2">
                                <Badge variant={statusVariants[order.estado]} className="capitalize">{order.estado.replace('-', ' ')}</Badge>
                                <Badge variant={priorityVariants[order.prioridad]} className="capitalize">{order.prioridad}</Badge>
                            </div>
                             <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(order.fechaProgramada)} - {order.horaProgramada}</span>
                            </div>
                             <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>{order.tecnicoNombre || 'No asignado'}</span>
                            </div>
                        </CardContent>
                    </Card>
                )) : (
                     <div className="text-center py-10 text-muted-foreground">
                        No se encontraron órdenes de trabajo.
                    </div>
                )}
           </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Fecha Programada</TableHead>
                  <TableHead>Prioridad</TableHead>
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
                        <Badge variant={priorityVariants[order.prioridad]} className="capitalize">{order.prioridad}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[order.estado]} className="capitalize">{order.estado.replace('-', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <OrderActions order={order} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                      No se encontraron órdenes de trabajo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <DeleteWorkOrderDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        order={selectedOrder}
        onConfirm={onDeletionConfirmed}
      />
    </>
  );
}
