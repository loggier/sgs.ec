
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
  const [hasMore, setHasMore] = React.useState(false);

  const fetchPayments = React.useCallback(async (cursor?: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { payments: newPayments, hasMore: newHasMore } = await getAllPayments(user, cursor);
      setPayments(prev => cursor ? [...prev, ...newPayments] : newPayments);
      setHasMore(newHasMore);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de pagos.",
        variant: "destructive"
      });
      setPayments([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);
  
  const handleLoadMore = () => {
    const lastPayment = payments[payments.length - 1];
    if (lastPayment?.refPath) {
        fetchPayments(lastPayment.refPath);
    }
  };

  const handleDataChange = () => {
      // Reset and fetch from the beginning
      setPayments([]);
      setHasMore(false);
      fetchPayments();
  }

  return (
    <>
      <Header title="Gestión de Pagos" />
      <div className="space-y-8">
        <NewPaymentSection onPaymentSaved={handleDataChange} />
        <PaymentHistoryList 
            payments={payments} 
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onPaymentDeleted={handleDataChange}
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
