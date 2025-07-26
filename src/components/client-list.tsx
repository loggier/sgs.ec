
'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Car, CreditCard } from 'lucide-react';
import Link from 'next/link';

import type { ClientDisplay } from '@/lib/schema';
import { useAuth } from '@/context/auth-context';
import { useSearch } from '@/context/search-context';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import ClientForm from './client-form';
import DeleteClientDialog from './delete-client-dialog';
import ClientPaymentForm from './client-payment-form';


type ClientListProps = {
  initialClients: ClientDisplay[];
};

const CLIENTS_PER_PAGE = 10;

export default function ClientList({ initialClients }: ClientListProps) {
  const { user } = useAuth();
  const { searchTerm } = useSearch();
  const [clients, setClients] = React.useState(initialClients);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<ClientDisplay | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    setClients(initialClients);
    setCurrentPage(1);
  }, [initialClients]);
  
  const handleAddClient = () => {
    setSelectedClient(null);
    setIsSheetOpen(true);
  };

  const handleEditClient = (client: ClientDisplay) => {
    setSelectedClient(client);
    setIsSheetOpen(true);
  };

  const handleDeleteClient = (client: ClientDisplay) => {
    if (client.source === 'wox') return;
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };
  
  const handleRegisterPayment = (client: ClientDisplay) => {
    if (client.source === 'wox') return;
    setSelectedClient(client);
    setIsPaymentDialogOpen(true);
  }

  const handleFormSave = (result: { client?: ClientDisplay }) => {
    if (result.client) {
      setClients(currentClients => {
        const newClient = { ...result.client, ownerName: result.client.ownerName || user?.nombre };
        const existing = currentClients.find(c => c.id === newClient.id);
        if (existing) {
          return currentClients.map(c => c.id === newClient.id ? newClient : c);
        }
        return [...currentClients, newClient];
      });
    }
    
    setIsSheetOpen(false);
    setSelectedClient(null);
  };
  
  const handlePaymentSave = () => {
      setIsPaymentDialogOpen(false);
      setSelectedClient(null);
  };

  const onClientDeleted = (clientId: string) => {
    setClients(currentClients => currentClients.filter(c => c.id !== clientId));
    setIsDeleteDialogOpen(false);
  }

  const getStatusVariant = (status: ClientDisplay['estado']) => {
    switch (status) {
      case 'al dia':
        return 'success';
      case 'adeuda':
        return 'warning';
      case 'retirado':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const badgeVariants = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    destructive: 'bg-red-100 text-red-800 border-red-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  
  const displayStatus: Record<ClientDisplay['estado'], string> = {
    'al dia': 'Al día',
    'adeuda': 'Adeuda',
    'retirado': 'Retirado'
  }

  const filteredClients = React.useMemo(() => {
    if (!searchTerm) return clients;
    const lowercasedTerm = searchTerm.toLowerCase();
    return clients.filter(client =>
        client.nomSujeto.toLowerCase().includes(lowercasedTerm) ||
        (client.codIdSujeto && client.codIdSujeto.toLowerCase().includes(lowercasedTerm)) ||
        (client.ciudad && client.ciudad.toLowerCase().includes(lowercasedTerm)) ||
        (client.telefono && client.telefono.includes(lowercasedTerm)) ||
        (client.ownerName && client.ownerName.toLowerCase().includes(lowercasedTerm))
    );
  }, [searchTerm, clients]);

  const totalPages = Math.ceil(filteredClients.length / CLIENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * CLIENTS_PER_PAGE;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + CLIENTS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6 mt-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestión de Clientes</CardTitle>
                  <CardDescription>Agregue, edite o elimine clientes.</CardDescription>
                </div>
                {user && ['master', 'manager'].includes(user.role) && (
                  <Button onClick={handleAddClient} size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Nuevo Cliente
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
                    <TableHead>Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Origen</TableHead>
                    {user?.role === 'master' && <TableHead>Propietario</TableHead>}
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.length > 0 ? (
                    paginatedClients.map(client => (
                      <TableRow key={`${client.id}-${client.source || 'local'}`}>
                        <TableCell>
                            <div className="font-medium">{client.nomSujeto}</div>
                            {client.codIdSujeto && <div className="text-sm text-muted-foreground">{client.codIdSujeto}</div>}
                            {client.managerEmail && <div className="text-xs text-blue-600">Manager: {client.managerEmail}</div>}
                        </TableCell>
                        <TableCell>
                            <div>{client.ciudad || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{client.telefono || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline" className={badgeVariants[getStatusVariant(client.estado)]}>
                              {displayStatus[client.estado]}
                           </Badge>
                        </TableCell>
                        <TableCell>
                            {client.source === 'wox' ? (
                                <Badge variant="outline" className={badgeVariants.info}>WOX</Badge>
                            ) : (
                                <Badge variant="secondary">Interno</Badge>
                            )}
                        </TableCell>
                        {user?.role === 'master' && (
                            <TableCell>{client.ownerName || 'N/A'}</TableCell>
                        )}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Alternar menú</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClient(client)}>
                                  <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                              {client.source === 'local' && (
                                <>
                                  <DropdownMenuItem>
                                    <Link href={`/clients/${client.id}/units`} className="flex items-center w-full">
                                      <Car className="mr-2 h-4 w-4" /> Ver Unidades
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRegisterPayment(client)}>
                                    <CreditCard className="mr-2 h-4 w-4" /> Registrar Pago
                                  </DropdownMenuItem>
                                  {user && (user.role === 'master' || user.id === client.ownerId) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleDeleteClient(client)} className="text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={user?.role === 'master' ? 6 : 5} className="text-center">
                        No se encontraron clientes.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
           <CardFooter>
            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
              <span>
                Mostrando {Math.min(startIndex + 1, filteredClients.length)} - {Math.min(startIndex + CLIENTS_PER_PAGE, filteredClients.length)} de {filteredClients.length} clientes.
              </span>
              <div className="flex items-center gap-2">
                 <span>Página {currentPage} de {totalPages}</span>
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
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
              </div>
            </div>
          </CardFooter>

          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="sm:max-w-2xl w-full">
              <SheetHeader>
                <SheetTitle>{selectedClient?.source === 'local' || !selectedClient ? 'Editar Cliente' : 'Enriquecer Datos de Cliente WOX'}</SheetTitle>
              </SheetHeader>
              <ClientForm
                client={selectedClient}
                onSave={handleFormSave}
                onCancel={() => setIsSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <DeleteClientDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={() => setIsDeleteDialogOpen(false)}
            client={selectedClient}
            onDelete={() => {
              if (selectedClient) {
                onClientDeleted(selectedClient.id);
              }
            }}
          />
          
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                      <DialogTitle>Registrar Pago para {selectedClient?.nomSujeto}</DialogTitle>
                      <DialogDescription>
                          Seleccione una o más unidades y complete los detalles del pago. El monto total se calculará automáticamente.
                      </DialogDescription>
                  </DialogHeader>
                  {selectedClient?.source === 'local' && selectedClient.id && (
                      <ClientPaymentForm 
                          clientId={selectedClient.id}
                          clientName={selectedClient.nomSujeto}
                          onSave={handlePaymentSave}
                          onCancel={() => setIsPaymentDialogOpen(false)}
                      />
                  )}
              </DialogContent>
          </Dialog>

        </Card>
      </div>
    </>
  );
}
