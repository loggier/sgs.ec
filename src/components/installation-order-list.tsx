

'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, HardHat, User, Calendar, CreditCard, ListFilter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import type { InstallationOrder } from '@/lib/installation-order-schema';
import { useSearch } from '@/context/search-context';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import DeleteInstallationOrderDialog from './delete-installation-order-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteInstallationOrder } from '@/lib/installation-order-actions';


type InstallationOrderListProps = {
  initialOrders: InstallationOrder[];
  onDataChange: () => void;
};

const ORDERS_PER_PAGE = 10;

function formatCurrency(amount?: number | null) {
  if (amount === undefined || amount === null) return '$0.00';
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function InstallationOrderList({ initialOrders, onDataChange }: InstallationOrderListProps) {
  const { searchTerm } = useSearch();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = React.useState(initialOrders);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<InstallationOrder | null>(null);

  const [statusFilter, setStatusFilter] = React.useState('todos');
  const [paymentMethodFilter, setPaymentMethodFilter] = React.useState('todos');
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);
  
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, paymentMethodFilter, searchTerm]);

  const handleOpenDeleteDialog = (order: InstallationOrder) => {
    setSelectedOrder(order);
    setIsDeleteDialogOpen(true);
  };

  const onDeletionConfirmed = async () => {
    if (!selectedOrder || !currentUser) return;
    
    const result = await deleteInstallationOrder(selectedOrder.id, currentUser);
    
    if (result.success) {
        toast({ title: 'Éxito', description: result.message });
        setIsDeleteDialogOpen(false);
        onDataChange();
    } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
        setIsDeleteDialogOpen(false);
    }
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
    let tempOrders = orders;

    // Filter by status
    if (statusFilter !== 'todos') {
        tempOrders = tempOrders.filter(order => order.estado === statusFilter);
    }
    
    // Filter by payment method
    if (paymentMethodFilter !== 'todos') {
        tempOrders = tempOrders.filter(order => order.metodoPago === paymentMethodFilter);
    }

    // Filter by search term
    if (!searchTerm) return tempOrders;

    const lowercasedTerm = searchTerm.toLowerCase();
    return tempOrders.filter(order =>
      order.nombreCliente.toLowerCase().includes(lowercasedTerm) ||
      order.placaVehiculo.toLowerCase().includes(lowercasedTerm) ||
      order.ciudad.toLowerCase().includes(lowercasedTerm) ||
      (order.tecnicoNombre && order.tecnicoNombre.toLowerCase().includes(lowercasedTerm))
    );
  }, [searchTerm, orders, statusFilter, paymentMethodFilter]);

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  const OrderActions = ({ order }: { order: InstallationOrder }) => (
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
                <CardTitle>Listado de Instalaciones</CardTitle>
                <CardDescription>Cree y gestione las tareas de instalación.</CardDescription>
            </div>
            <div className="flex items-center flex-wrap gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <ListFilter className="mr-2 h-4 w-4" />
                        <span>{statusFilter === 'todos' ? 'Todos los estados' : `Estado: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('-', ' ')}`}</span>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                        <DropdownMenuRadioItem value="todos">Todos</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="pendiente">Pendiente</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="en-curso">En Curso</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="terminado">Terminado</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
                
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>{
                            paymentMethodFilter === 'todos' ? 'Todos los pagos' :
                            paymentMethodFilter === 'efectivo' ? 'Pago: Efectivo' :
                            paymentMethodFilter === 'transferencia' ? 'Pago: Transferencia' :
                            'Método de Pago'
                        }</span>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                        <DropdownMenuRadioItem value="todos">Todos</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="efectivo">Efectivo</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="transferencia">Transferencia</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {currentUser?.role !== 'tecnico' && (
                    <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link href="/installations/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nueva Orden de Instalación
                    </Link>
                    </Button>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
           <div className="md:hidden space-y-4">
                {paginatedOrders.length > 0 ? paginatedOrders.map(order => (
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
                                <Badge variant="outline" className="capitalize">{order.tipoPlan}</Badge>
                            </div>
                             <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(order.fechaProgramada)} - {order.horaProgramada}</span>
                            </div>
                             <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>{order.tecnicoNombre || 'No asignado'}</span>
                            </div>
                             {order.metodoPago && (
                                <div className="flex items-center gap-2 text-muted-foreground pt-1">
                                    <CreditCard className="h-4 w-4" />
                                    <span className="capitalize">{order.metodoPago}</span>
                                    {order.metodoPago === 'efectivo' && (
                                        <span className="font-semibold text-foreground">{formatCurrency(order.montoEfectivo)}</span>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )) : (
                     <div className="text-center py-10 text-muted-foreground">
                        No se encontraron órdenes de instalación.
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
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Método Pago</TableHead>
                  <TableHead>Monto Efectivo</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.length > 0 ? (
                  paginatedOrders.map(order => (
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
                        {order.metodoPago ? <Badge variant="secondary" className="capitalize">{order.metodoPago}</Badge> : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {order.metodoPago === 'efectivo' ? formatCurrency(order.montoEfectivo) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <OrderActions order={order} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-24">
                      No se encontraron órdenes de instalación.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
            <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <span>
                Mostrando {Math.min(startIndex + 1, filteredOrders.length)} - {Math.min(startIndex + ORDERS_PER_PAGE, filteredOrders.length)} de {filteredOrders.length} órdenes.
              </span>
              <div className="flex items-center gap-2">
                 <span>Página {currentPage} de {totalPages > 0 ? totalPages : 1}</span>
                 <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    Siguiente
                  </Button>
              </div>
            </div>
          </CardFooter>
      </Card>
      
      <DeleteInstallationOrderDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        order={selectedOrder}
        onConfirm={onDeletionConfirmed}
      />
    </>
  );
}
