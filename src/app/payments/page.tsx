
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

type PageInfo = {
  lastVisible: string | null;
  firstVisible: string | null;
  hasMore: boolean;
};

function PaymentsPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = React.useState<PaymentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [page, setPage] = React.useState(1);
  const [pageHistory, setPageHistory] = React.useState<(string | null)[]>([null]);
  const [currentPageInfo, setCurrentPageInfo] = React.useState<PageInfo>({
    lastVisible: null,
    firstVisible: null,
    hasMore: false,
  });

  const fetchPayments = React.useCallback(async (cursor: string | null = null, direction: 'next' | 'prev' = 'next') => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { payments: newPayments, lastVisible, firstVisible, hasMore } = await getPayments(user, cursor, direction);
      setPayments(newPayments);
      setCurrentPageInfo({ lastVisible, firstVisible, hasMore });
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

  const handleNextPage = () => {
    if (!currentPageInfo.lastVisible) return;
    setPageHistory([...pageHistory, currentPageInfo.lastVisible]);
    setPage(page + 1);
    fetchPayments(currentPageInfo.lastVisible, 'next');
  };

  const handlePrevPage = () => {
    if (page <= 1) return;
    const prevHistory = [...pageHistory];
    prevHistory.pop();
    const prevCursor = prevHistory[prevHistory.length - 1] ?? null;
    setPageHistory(prevHistory);
    setPage(page - 1);
    fetchPayments(prevCursor, 'next');
  };

  const handleDataChange = () => {
    setPage(1);
    setPageHistory([null]);
    fetchPayments();
  };

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
          page={page}
          hasMore={currentPageInfo.hasMore}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
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
