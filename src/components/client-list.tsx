'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Car, CreditCard, Search, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import type { Client, ClientWithOwner } from '@/lib/schema';
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

import ClientForm from './client-form';
import DeleteClientDialog from './delete-client-dialog';
import ClientPaymentForm from './client-payment-form';
import Header from './header';

type ClientListProps = {
  initialClients: ClientWithOwner[];
};

function formatCurrency(amount?: number | null) {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(date?: Date | string | null) {
    if (!date) return 'N/A';
    try {
        return format(new Date(date), 'P', { locale: es });
    } catch (error) {
        return 'Fecha inválida';
    }
}

export default function ClientList({ initialClients }: ClientListProps) {
  const { user } = useAuth();
  const [clients, setClients] = React.useState(initialClients);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<ClientWithOwner | null>(null);

  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  React.useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);
  
  const handleAddClient = () => {
    setSelectedClient(null);
    setIsSheetOpen(true);
  };

  const handleEditClient = (client: ClientWithOwner) => {
    setSelectedClient(client);
    setIsSheetOpen(true);
  };

  const handleDeleteClient = (client: ClientWithOwner) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  const handleRegisterPayment = (client: ClientWithOwner) => {
    setSelectedClient(client);
    setIsPaymentDialogOpen(true);
  }

  const handleFormSave = (result: { client?: ClientWithOwner }) => {
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

  const onClientDeleted = (clientId: string) => {
    setClients(currentClients => currentClients.filter(c => c.id !== clientId));
    setIsDeleteDialogOpen(false);
  }

  const getStatusVariant = (status: Client['estado']) => {
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
  };
  
  const displayStatus: Record<Client['estado'], string> = {
    'al dia': 'Al día',
    'adeuda': 'Adeuda',
    'retirado': 'Retirado'
  }

  const filteredClients = React.useMemo(() => {
    if (!searchTerm) return clients;
    const lowercasedTerm = searchTerm.toLowerCase();
    return clients.filter(client =>
        client.nomSujeto.toLowerCase().includes(lowercasedTerm) ||
        client.codIdSujeto.toLowerCase().includes(lowercasedTerm) ||
        (client.ciudad && client.ciudad.toLowerCase().includes(lowercasedTerm)) ||
        (client.telefono && client.telefono.includes(lowercasedTerm)) ||
        client.numOperacion.toLowerCase().includes(lowercasedTerm) ||
        (client.ownerName && client.ownerName.toLowerCase().includes(lowercasedTerm))
    );
  }, [searchTerm, clients]);

  return (
    <>
      <Header title="Clientes" />
      <div className="flex flex-col gap-6 mt-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestión de Clientes</CardTitle>
                  <CardDescription>Busque, agregue, edite o elimine clientes.</CardDescription>
                </div>
                <Button onClick={handleAddClient} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Cliente
                </Button>
            </div>
            <div className="relative mt-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por nombre, cédula, ciudad, propietario..."
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
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Valores</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    {user?.role === 'master' && <TableHead>Propietario</TableHead>}
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell>
                            <div className="font-medium">{client.nomSujeto}</div>
                            <div className="text-sm text-muted-foreground">{client.codIdSujeto}</div>
                        </TableCell>
                        <TableCell>
                            <div>{client.ciudad || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{client.telefono || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                            <div>{client.numOperacion}</div>
                            <div className="text-sm text-muted-foreground">API: {client.usuario || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                            <div title="Valor Operación">{formatCurrency(client.valOperacion)}</div>
                            <div className="text-sm text-muted-foreground" title="Valor Pago">{formatCurrency(client.valorPago)}</div>
                            <div className="text-sm text-red-600" title="Valor Vencido">{formatCurrency(client.valorVencido)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={badgeVariants[getStatusVariant(client.estado)]}>
                            {displayStatus[client.estado]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {hasMounted ? formatDate(client.fecVencimiento) : ''}
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
                              <DropdownMenuItem asChild>
                                <Link href={`/clients/${client.id}/units`}>
                                  <Car className="mr-2 h-4 w-4" /> Ver Unidades
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRegisterPayment(client)}>
                                <CreditCard className="mr-2 h-4 w-4" /> Registrar Pago
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditClient(client)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClient(client)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={user?.role === 'master' ? 8 : 7} className="text-center">
                        No se encontraron clientes.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="sm:max-w-2xl w-full">
              <SheetHeader>
                <SheetTitle>{selectedClient ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</SheetTitle>
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
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Registrar Pago para {selectedClient?.nomSujeto}</DialogTitle>
                      <DialogDescription>
                          Seleccione la unidad y complete los detalles del pago.
                      </DialogDescription>
                  </DialogHeader>
                  {selectedClient && (
                      <ClientPaymentForm
                          client={selectedClient}
                          onSave={() => setIsPaymentDialogOpen(false)}
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