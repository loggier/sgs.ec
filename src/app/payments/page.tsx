

'use client';

import * as React from 'react';
import { getAllPayments } from '@/lib/payment-actions';
import PaymentHistoryList from '@/components/payment-history-list';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import NewPaymentSection from '@/components/new-payment-section';
import AppContent from '@/components/app-content';

function PaymentsPageContent() {
  const { user } = useAuth();
  const [initialLoad, setInitialLoad] = React.useState(true);

  const fetchPayments = React.useCallback(async () => {
    // This function can be used to trigger a re-fetch, for example by resetting state in the list
  }, []);
  
  React.useEffect(() => {
    if (user) {
        setInitialLoad(false);
    }
  }, [user]);

  if (initialLoad) {
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
        <PaymentHistoryList onPaymentDeleted={fetchPayments} />
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
