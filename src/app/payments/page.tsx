
'use client';

import * as React from 'react';
import { getAllPayments } from '@/lib/payment-actions';
import PaymentHistoryList from '@/components/payment-history-list';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import NewPaymentSection from '@/components/new-payment-section';
import AppContent from '@/components/app-content';
import type { PaymentHistoryEntry } from '@/lib/payment-schema';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

function PaymentsPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = React.useState<PaymentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = React.useState(true);

  const fetchPayments = React.useCallback(async (loadMore = false) => {
    if (!user) return;

    if (loadMore) {
        setIsLoadingMore(true);
    } else {
        setIsLoading(true);
        setPayments([]); // Reset on initial load or refresh
    }

    try {
        const { payments: newPayments, lastVisible: newLastVisible, hasMore: newHasMore } = await getAllPayments(
            user,
            loadMore ? lastVisible : null
        );

        setPayments(prev => loadMore ? [...prev, ...newPayments] : newPayments);
        setLastVisible(newLastVisible);
        setHasMore(newHasMore);

    } catch (error) {
      toast({
          title: "Error",
          description: "No se pudo cargar el historial de pagos.",
          variant: "destructive"
      });
      setPayments([]);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, toast, lastVisible]);

  React.useEffect(() => {
    fetchPayments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDataChange = () => {
    fetchPayments();
  }
  
  if (!user) {
    return (
        <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <>
      <Header title="Gestión de Pagos" />
      <div className="space-y-8">
        <NewPaymentSection onPaymentSaved={handleDataChange} />
        <PaymentHistoryList 
            initialPayments={payments} 
            isLoading={isLoading}
            onPaymentDeleted={handleDataChange}
            onLoadMore={() => fetchPayments(true)}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
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
