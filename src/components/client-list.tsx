'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Car, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import type { Client } from '@/lib/schema';
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

import ClientForm from './client-form';
import DeleteClientDialog from './delete-client-dialog';
import CreditRiskDialog from './credit-risk-dialog';
import ClientPaymentForm from './client-payment-form';
import type { AssessCreditRiskOutput } from '@/ai/flows/credit-risk-assessment';

type ClientListProps = {
  initialClients: Omit<Client, 'placaVehiculo'>[];
};

export default function ClientList({ initialClients }: ClientListProps) {
  const [clients, setClients] = React.useState(initialClients);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isRiskDialogOpen, setIsRiskDialogOpen] = React.useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<Omit<Client, 'placaVehiculo'> | null>(null);
  const [assessmentResult, setAssessmentResult] = React.useState<AssessCreditRiskOutput | null>(null);

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

  const handleEditClient = (client: Omit<Client, 'placaVehiculo'>) => {
    setSelectedClient(client);
    setIsSheetOpen(true);
  };

  const handleDeleteClient = (client: Omit<Client, 'placaVehiculo'>) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  const handleRegisterPayment = (client: Omit<Client, 'placaVehiculo'>) => {
    setSelectedClient(client);
    setIsPaymentDialogOpen(true);
  }

  const handleFormSave = (result: { client?: Omit<Client, 'placaVehiculo'>, assessment?: AssessCreditRiskOutput }) => {
    if (result.client) {
      setClients(currentClients => {
        const existing = currentClients.find(c => c.id === result.client!.id);
        if (existing) {
          return currentClients.map(c => c.id === result.client!.id ? result.client! : c);
        }
        return [...currentClients, result.client!];
      });
    }
    
    setIsSheetOpen(false);
    setSelectedClient(null);

    if (result.assessment) {
      setAssessmentResult(result.assessment);
      setIsRiskDialogOpen(true);
    }
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

  // Custom variants for Badge
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gestión de Clientes</CardTitle>
          <Button onClick={handleAddClient} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Valor de Operación</TableHead>
                <TableHead className="hidden lg:table-cell">Fecha de Vencimiento</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length > 0 ? (
                clients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.nomSujeto}</TableCell>
                    <TableCell>{client.ciudad || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badgeVariants[getStatusVariant(client.estado)]}>
                        {displayStatus[client.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {client.valOperacion ? new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(client.valOperacion) : 'N/A'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {hasMounted && client.fecVencimiento ? format(new Date(client.fecVencimiento), 'P', { locale: es }) : 'N/A'}
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
                  <TableCell colSpan={6} className="text-center">
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
      
      <CreditRiskDialog
        isOpen={isRiskDialogOpen}
        onOpenChange={setIsRiskDialogOpen}
        assessment={assessmentResult}
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
  );
}