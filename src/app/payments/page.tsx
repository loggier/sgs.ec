
'use client';

import * as React from 'react';
import { getAllPayments } from '@/lib/payment-actions';
import PaymentHistoryList from '@/components/payment-history-list';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import type { PaymentHistoryEntry } from '@/lib/payment-schema';
import { Skeleton } from '@/components/ui/skeleton';
import NewPaymentSection from '@/components/new-payment-section';

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = React.useState<PaymentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchPayments = React.useCallback(() => {
    if (user) {
      setIsLoading(true);
      getAllPayments(user.id, user.role)
        .then(data => {
          setPayments(data);
          setIsLoading(false);
        });
    }
  }, [user]);

  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  if (isLoading && payments.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Gestión de Pagos" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full mt-6" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Gestión de Pagos" />
      <div className="space-y-8">
        <NewPaymentSection onPaymentSaved={fetchPayments} />
        <PaymentHistoryList initialPayments={payments} onPaymentDeleted={fetchPayments} isLoading={isLoading} />
      </div>
    </div>
  );
}
