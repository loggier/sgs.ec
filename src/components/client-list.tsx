
'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Car, CreditCard, Link2, MessageSquare, Building, Mail, Phone } from 'lucide-react';
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
import SendMessageDialog from './send-qyvoo-message-dialog';
import { Separator } from './ui/separator';


type ClientListProps = {
  initialClients: ClientDisplay[];
  onDataChange: () => void;
};

const CLIENTS_PER_PAGE = 10;

function formatCurrency(amount?: number) {
  if (amount === undefined || amount === null) return '$0.00';
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function ClientList({ initialClients, onDataChange }: ClientListProps) {
  const { user } = useAuth();
  const { searchTerm } = useSearch();
  const [clients, setClients] = React.useState(initialClients);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = React.useState(false);
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
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };
  
  const handleRegisterPayment = (client: ClientDisplay) => {
    setSelectedClient(client);
    setIsPaymentDialogOpen(true);
  }

  const handleOpenMessageDialog = (client: ClientDisplay) => {
    setSelectedClient(client);
    setIsMessageDialogOpen(true);
  };

  const handleFormSave = () => {
    onDataChange();
    setIsSheetOpen(false);
    setSelectedClient(null);
  };
  
  const handlePaymentSave = () => {
      onDataChange();
      setIsPaymentDialogOpen(false);
      setSelectedClient(null);
  };

  const onClientDeleted = (clientId: string) => {
    setClients(currentClients => currentClients.filter(c => c.id !== clientId));
    setIsDeleteDialogOpen(false);
    onDataChange();
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

  const clientTypeBadgeVariants: Record<string, string> = {
    Personal: 'bg-purple-100 text-purple-800 border-purple-200',
    Negocio: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    Corporativo: 'bg-sky-100 text-sky-800 border-sky-200',
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
        (client.correo && client.correo.toLowerCase().includes(lowercasedTerm)) ||
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

  const ClientActions = ({ client }: { client: ClientDisplay }) => (
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
            <DropdownMenuItem asChild>
                <Link href={`/clients/${client.id}/units`} className="flex items-center w-full">
                <Car className="mr-2 h-4 w-4" /> Ver Unidades
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRegisterPayment(client)}>
                <CreditCard className="mr-2 h-4 w-4" /> Registrar Pago
            </DropdownMenuItem>
            {client.telefono && (
                <DropdownMenuItem onClick={() => handleOpenMessageDialog(client)}>
                <MessageSquare className="mr-2 h-4 w-4" /> Enviar Mensaje
                </DropdownMenuItem>
            )}
            {user && ['master', 'manager'].includes(user.role) && (
                <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDeleteClient(client)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
                </>
            )}
        </DropdownMenuContent>
    </DropdownMenu>
    );

  return (
    <>
      <div className="flex flex-col gap-6 mt-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle>Gestión Integrar</CardTitle>
                  <CardDescription>Agregue, edite o elimine clientes.</CardDescription>
                </div>
                {user && ['master', 'manager', 'analista'].includes(user.role) && (
                  <Button onClick={handleAddClient} size="sm" className="w-full sm:w-auto">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Nuevo Cliente
                  </Button>
                )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Mobile View */}
            <div className="md:hidden space-y-4">
              {paginatedClients.length > 0 ? paginatedClients.map(client => (
                <Card key={client.id} className="w-full">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                {client.nomSujeto}
                                {client.pgpsId && <Badge variant="outline" className={badgeVariants.info}><Link2 className="h-3 w-3 mr-1"/>P. GPS</Badge>}
                            </CardTitle>
                            <CardDescription>{client.codIdSujeto}</CardDescription>
                        </div>
                        <ClientActions client={client} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                     <div className="flex items-center gap-2">
                        <Badge variant="outline" className={badgeVariants[getStatusVariant(client.estado)]}>
                            {displayStatus[client.estado]}
                        </Badge>
                         <Badge variant="outline" className={clientTypeBadgeVariants[client.tipoCliente || 'Personal']}>
                            {client.tipoCliente || 'Personal'}
                        </Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Unidades</span>
                      <div className="flex items-center gap-2 font-medium">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span>{client.unitCount ?? 0}</span>
                      </div>
                    </div>
                     <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Pago Mensual</span>
                        <span className="font-semibold">{formatCurrency(client.totalMonthlyPayment)}</span>
                    </div>
                     {(client.totalContractAmount ?? 0) > 0 &&
                        <>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Total Contratos</span>
                                <span className="font-semibold">{formatCurrency(client.totalContractAmount)}</span>
                            </div>
                             <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Saldo Contratos</span>
                                <span className="font-semibold text-blue-600">{formatCurrency(client.totalContractBalance)}</span>
                            </div>
                        </>
                    }
                    <Separator />
                    {client.correo && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {client.correo}</div>}
                    {client.telefono && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {client.telefono}</div>}
                    {user?.role === 'master' && <div className="flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" /> {client.ownerName || 'N/A'}</div>}
                  </CardContent>
                </Card>
              )) : (
                <div className="text-center py-10 text-muted-foreground">
                    No se encontraron clientes.
                </div>
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Financiero</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead>Tipo de Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    {user?.role === 'master' && <TableHead>Propietario</TableHead>}
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.length > 0 ? (
                    paginatedClients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell>
                            <div className="font-medium flex items-center gap-2">
                              {client.nomSujeto}
                              {client.pgpsId && <Badge variant="outline" className={badgeVariants.info}><Link2 className="h-3 w-3 mr-1"/>P. GPS</Badge>}
                            </div>
                            <div className="text-sm text-muted-foreground">{client.codIdSujeto}</div>
                             <div className="flex items-center gap-2 mt-1">
                                {client.correo ? 
                                    <div className="text-sm text-muted-foreground">{client.correo}</div> :
                                    client.telefono && <div className="text-sm text-muted-foreground">{client.telefono}</div>
                                }
                             </div>
                        </TableCell>
                        <TableCell>
                            <div title="Pago mensual total" className="flex items-center text-sm">
                              <span className="font-semibold">{formatCurrency(client.totalMonthlyPayment)}</span>
                              <span className="text-muted-foreground ml-1">/mes</span>
                            </div>
                            {(client.totalContractAmount ?? 0) > 0 &&
                              <>
                                <div title="Monto total de contratos" className="text-xs text-muted-foreground">
                                  Contratos: {formatCurrency(client.totalContractAmount)}
                                </div>
                                <div title="Saldo pendiente de contratos" className="text-xs text-blue-600 font-semibold">
                                  Saldo: {formatCurrency(client.totalContractBalance)}
                                </div>
                              </>
                            }
                        </TableCell>
                         <TableCell>
                           <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{client.unitCount ?? 0}</span>
                           </div>
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline" className={clientTypeBadgeVariants[client.tipoCliente || 'Personal']}>
                            {client.tipoCliente || 'Personal'}
                           </Badge>
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline" className={badgeVariants[getStatusVariant(client.estado)]}>
                              {displayStatus[client.estado]}
                           </Badge>
                        </TableCell>
                        {user?.role === 'master' && (
                            <TableCell>{client.ownerName || 'N/A'}</TableCell>
                        )}
                        <TableCell>
                            <ClientActions client={client} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={user?.role === 'master' ? 7 : 6} className="text-center">
                        No se encontraron clientes.
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
        </Card>

          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="sm:max-w-2xl w-full">
              <SheetHeader>
                <SheetTitle>{selectedClient ? 'Editar Cliente' : 'Nuevo Cliente'}</SheetTitle>
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
            onOpenChange={setIsDeleteDialogOpen}
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
                  {selectedClient?.id && (
                      <ClientPaymentForm 
                          clientId={selectedClient.id}
                          clientName={selectedClient.nomSujeto}
                          onSave={handlePaymentSave}
                          onCancel={() => setIsPaymentDialogOpen(false)}
                      />
                  )}
              </DialogContent>
          </Dialog>

          <SendMessageDialog
            isOpen={isMessageDialogOpen}
            onOpenChange={setIsMessageDialogOpen}
            client={selectedClient}
          />
      </div>
    </>
  );
}
