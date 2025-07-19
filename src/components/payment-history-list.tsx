
'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

import type { PaymentHistoryEntry } from '@/lib/payment-schema';
import { useAuth } from '@/context/auth-context';
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
import { Input } from '@/components/ui/input';

type PaymentHistoryListProps = {
  initialPayments: PaymentHistoryEntry[];
};

function formatCurrency(amount?: number) {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(date?: Date | string) {
  if (!date) return 'N/A';
  return format(new Date(date), 'P', { locale: es });
}

export default function PaymentHistoryList({ initialPayments }: PaymentHistoryListProps) {
  const { user } = useAuth();
  const [payments, setPayments] = React.useState(initialPayments);
  const [searchTerm, setSearchTerm] = React.useState('');

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Todos los Pagos</CardTitle>
            <CardDescription>Busque y filtre todos los pagos registrados en el sistema.</CardDescription>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por cliente, placa, factura, propietario..."
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
                <TableHead>Fecha de Pago</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Placa</TableHead>
                {user?.role === 'master' && <TableHead>Propietario</TableHead>}
                <TableHead>Monto</TableHead>
                <TableHead>Meses Pagados</TableHead>
                <TableHead>Forma de Pago</TableHead>
                <TableHead>Factura No.</TableHead>
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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={user?.role === 'master' ? 8 : 7} className="text-center">
                    No se encontraron pagos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
