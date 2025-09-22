
'use client';

import * as React from 'react';
import { getPayments } from '@/lib/payment-actions';
import PaymentHistoryList from '@/components/payment-history-list';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import NewPaymentSection from '@/components/new-payment-section';
import AppContent from '@/components/app-content';
import type { PaymentHistoryEntry } from '@/lib/payment-schema';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

function PaymentsPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = React.useState<PaymentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  
  const fetchPayments = React.useCallback(async (cursor: QueryDocumentSnapshot<DocumentData> | null) => {
    if (!user) return;
    
    if (cursor === null) { // Initial load
        setIsLoading(true);
    } else { // Loading more
        setIsLoadingMore(true);
    }

    try {
        const { payments: newPayments, lastVisible: newLastVisible, hasMore: newHasMore } = await getPayments(user, cursor);
        setPayments(prev => cursor ? [...prev, ...newPayments] : newPayments);
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
  }, [user, toast]);

  // Initial fetch
  React.useEffect(() => {
    fetchPayments(null);
  }, [fetchPayments]);

  const handleDataChange = () => {
    setLastVisible(null);
    setPayments([]);
    fetchPayments(null);
  }

  const handleLoadMore = () => {
      if (lastVisible) {
          fetchPayments(lastVisible);
      }
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
            onLoadMore={handleLoadMore}
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
