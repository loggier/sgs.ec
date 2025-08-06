
'use client';

import * as React from 'react';
import { MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import type { PaymentHistoryEntry } from '@/lib/payment-schema';
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

type PaymentHistoryListProps = {
  initialPayments: PaymentHistoryEntry[];
  onPaymentDeleted: () => void;
  isLoading: boolean;
};

function formatCurrency(amount?: number) {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(date?: Date | string) {
  if (!date) return 'N/A';
  return format(new Date(date), 'P', { locale: es });
}

export default function PaymentHistoryList({ initialPayments, onPaymentDeleted, isLoading }: PaymentHistoryListProps) {
  const { user } = useAuth();
  const { searchTerm } = useSearch();
  const [payments, setPayments] = React.useState(initialPayments);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState<PaymentHistoryEntry | null>(null);

  React.useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);

  const filteredPayments = React.useMemo(() => {
    if (!searchTerm) return payments;
    const lowercasedTerm = searchTerm.toLowerCase();
    return payments.filter(p =>
      p.clientName.toLowerCase().includes(lowercasedTerm) ||
      p.unitPlaca.toLowerCase().includes(lowercasedTerm) ||
      p.numeroFactura.toLowerCase().includes(lowercasedTerm) ||
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
    onPaymentDeleted(); // Call the callback to refetch data
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
              <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center">
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
                {filteredPayments.length > 0 ? (
                  filteredPayments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.fechaPago)}</TableCell>
                      <TableCell>
                        <Link href={`/clients/${payment.clientId}/units`} className="hover:underline text-primary font-medium">
                          {payment.clientName}
                        </Link>
                      </TableCell>
                      <TableCell>{payment.unitPlaca}</TableCell>
                      {user?.role === 'master' && <TableCell>{payment.ownerName}</TableCell>}
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
                    <TableCell colSpan={user?.role === 'master' ? 9 : 8} className="text-center">
                      No se encontraron pagos.
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
