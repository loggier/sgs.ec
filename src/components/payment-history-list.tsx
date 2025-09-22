
'use client';

import * as React from 'react';
import { MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import type { PaymentHistoryEntry } from '@/lib/payment-schema';
import { getAllPayments } from '@/lib/payment-actions';
import { useAuth } from '@/context/auth-context';
import { useSearch } from '@/context/search-context';
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import DeletePaymentDialog from './delete-payment-dialog';
import { useToast } from '@/hooks/use-toast';

type PaymentHistoryListProps = {
  onPaymentDeleted: () => void;
};

function formatCurrency(amount?: number) {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(date?: Date | string) {
  if (!date) return 'N/A';
  return format(new Date(date), 'P', { locale: es });
}

export default function PaymentHistoryList({ onPaymentDeleted }: PaymentHistoryListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { searchTerm } = useSearch();
  const [payments, setPayments] = React.useState<PaymentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState<PaymentHistoryEntry | null>(null);

  const fetchAndSetPayments = React.useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
      const allPayments = await getAllPayments(user);
      setPayments(allPayments);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de pagos.",
        variant: "destructive"
      });
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);
  
  React.useEffect(() => {
    fetchAndSetPayments();
  }, [fetchAndSetPayments]);


  const filteredPayments = React.useMemo(() => {
    if (!searchTerm) return payments;
    const lowercasedTerm = searchTerm.toLowerCase();
    return payments.filter(p =>
      p.clientName.toLowerCase().includes(lowercasedTerm) ||
      p.unitPlaca.toLowerCase().includes(lowercasedTerm) ||
      (p.numeroFactura && p.numeroFactura.toLowerCase().includes(lowercasedTerm)) ||
      (p.ownerName && p.ownerName.toLowerCase().includes(lowercasedTerm))
    );
  }, [searchTerm, payments]);
  
  const handleDeletePayment = (payment: PaymentHistoryEntry) => {
    setSelectedPayment(payment);
    setIsDeleteDialogOpen(true);
  };
  
  const handlePaymentDeleted = () => {
    setIsDeleteDialogOpen(false);
    setSelectedPayment(null);
    onPaymentDeleted();
    // Refetch all payments to reflect changes
    fetchAndSetPayments();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>Todos los pagos registrados en el sistema.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto relative">
             {isLoading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha de Pago</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Placa</TableHead>
                  {user?.role === 'master' && <TableHead>Propietario</TableHead>}
                  <TableHead>Monto</TableHead>
                  <TableHead>Meses Pagados</TableHead>
                  <TableHead>Forma de Pago</TableHead>
                  <TableHead>Factura No.</TableHead>
                  <TableHead><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isLoading && filteredPayments.length > 0 ? (
                  filteredPayments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.fechaPago)}</TableCell>
                      <TableCell>
                        <Link href={`/clients/${payment.clientId}/units`} className="hover:underline text-primary font-medium">
                          {payment.clientName}
                        </Link>
                      </TableCell>
                      <TableCell>{payment.unitPlaca}</TableCell>
                      {user?.role === 'master' && <TableCell>{payment.ownerName || 'N/A'}</TableCell>}
                      <TableCell className="font-semibold">{formatCurrency(payment.monto)}</TableCell>
                      <TableCell>{payment.mesesPagados}</TableCell>
                      <TableCell>
                          <Badge variant="secondary" className="capitalize">{payment.formaPago}</Badge>
                      </TableCell>
                      <TableCell>{payment.numeroFactura}</TableCell>
                      <TableCell>
                        {user && ['master', 'manager'].includes(user.role) && (
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Alternar menú</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDeletePayment(payment)} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar Pago
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={user?.role === 'master' ? 9 : 8} className="h-24 text-center">
                       {isLoading ? 'Cargando pagos...' : 'No se encontraron pagos.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <DeletePaymentDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        payment={selectedPayment}
        onDelete={handlePaymentDeleted}
      />
    </>
  );
}

    