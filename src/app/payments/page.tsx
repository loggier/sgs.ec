'use client';

import * as React from 'react';
import { getAllPayments } from '@/lib/payment-actions';
import PaymentHistoryList from '@/components/payment-history-list';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import NewPaymentSection from '@/components/new-payment-section';
import AppContent from '@/components/app-content';
import type { PaymentHistoryEntry } from '@/lib/payment-schema';
import { useToast } from '@/hooks/use-toast';

function PaymentsPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = React.useState<PaymentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchPayments = React.useCallback(async () => {
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
    fetchPayments();
  }, [fetchPayments]);

  if (isLoading && payments.length === 0) {
    return (
      <>
        <Header title="Gestión de Pagos" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full mt-6" />
      </>
    );
  }

  return (
    <>
      <Header title="Gestión de Pagos" />
      <div className="space-y-8">
        <NewPaymentSection onPaymentSaved={fetchPayments} />
        <PaymentHistoryList 
            initialPayments={payments} 
            onPaymentDeleted={fetchPayments}
            isLoading={isLoading} 
        />
      </div>
    </>
  );
}


export default function PaymentsPage() {
    return (
        <AppContent>
            <PaymentsPageContent />
        </AppContent>
    )
}
