
'use client';

import * as React from 'react';
import { getAllPayments } from '@/lib/payment-actions';
import PaymentHistoryList from '@/components/payment-history-list';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import type { PaymentHistoryEntry } from '@/lib/payment-schema';
import { Skeleton } from '@/components/ui/skeleton';

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = React.useState<PaymentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      setIsLoading(true);
      getAllPayments(user.id, user.role)
        .then(data => {
          setPayments(data);
          setIsLoading(false);
        });
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full space-y-6">
        <Header title="Historial de Pagos" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <Header title="Historial de Pagos" />
      <PaymentHistoryList initialPayments={payments} />
    </div>
  );
}
