
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
import type { Unit } from '@/lib/unit-schema';
import { getAllUnits } from '@/lib/unit-actions';

const UNITS_PER_PAGE = 10;

function PaymentsPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = React.useState<PaymentHistoryEntry[]>([]);
  const [allUnits, setAllUnits] = React.useState<Unit[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  
  // First, fetch all units the user has access to.
  React.useEffect(() => {
    if (user) {
      setIsLoading(true);
      getAllUnits(user)
        .then(units => {
          setAllUnits(units);
          if (units.length > 0) {
            fetchPayments(units, 1); // Fetch first page of payments
          } else {
            setPayments([]);
            setHasMore(false);
            setIsLoading(false);
          }
        })
        .catch(() => {
            toast({ title: "Error", description: "No se pudieron cargar las unidades.", variant: "destructive" });
            setIsLoading(false);
        });
    }
  }, [user, toast]);
  
  const fetchPayments = async (units: Unit[], pageToLoad: number) => {
    const isInitialLoad = pageToLoad === 1;
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
        const startIndex = (pageToLoad - 1) * UNITS_PER_PAGE;
        const endIndex = startIndex + UNITS_PER_PAGE;
        const unitsForPage = units.slice(startIndex, endIndex);

        if (unitsForPage.length === 0) {
            setHasMore(false);
            return;
        }

        const newPayments = await getAllPayments(unitsForPage);
        
        // Sort all payments by date descending
        const combinedPayments = [...(isInitialLoad ? [] : payments), ...newPayments];
        combinedPayments.sort((a, b) => new Date(b.fechaPago as string).getTime() - new Date(a.fechaPago as string).getTime());

        setPayments(combinedPayments);
        setHasMore(endIndex < units.length);

    } catch (error) {
      toast({
          title: "Error",
          description: "No se pudo cargar el historial de pagos.",
          variant: "destructive"
      });
      if (isInitialLoad) setPayments([]);
    } finally {
      if (isInitialLoad) setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleDataChange = () => {
    setPage(1);
    setPayments([]);
    if (user) {
      // Re-fetch everything on data change
       getAllUnits(user).then(units => {
          setAllUnits(units);
          fetchPayments(units, 1);
       });
    }
  }

  const handleLoadMore = () => {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPayments(allUnits, nextPage);
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
