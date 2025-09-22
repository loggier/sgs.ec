
'use client';

import * as React from 'react';
import { getAllPayments, backfillPaymentOwnerIds } from '@/lib/payment-actions';
import PaymentHistoryList from '@/components/payment-history-list';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import NewPaymentSection from '@/components/new-payment-section';
import AppContent from '@/components/app-content';
import type { PaymentHistoryEntry } from '@/lib/payment-schema';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BackfillConfirmationDialog from '@/components/backfill-confirmation-dialog';

function PaymentsPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = React.useState<PaymentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBackfilling, setIsBackfilling] = React.useState(false);
  const [isBackfillDialogOpen, setIsBackfillDialogOpen] = React.useState(false);

  const fetchPayments = React.useCallback(async () => {
    if (!user) return;
    
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

  const handleDataChange = () => {
    fetchPayments();
  }

  const handleConfirmBackfill = async () => {
    setIsBackfillDialogOpen(false);
    setIsBackfilling(true);
    toast({
        title: 'Iniciando actualización...',
        description: 'Recorriendo la base de datos para actualizar los registros. Esto puede tardar unos momentos.',
    });

    const result = await backfillPaymentOwnerIds();

    if (result.success) {
        toast({
            title: 'Actualización Completada',
            description: result.message,
        });
    } else {
        toast({
            title: 'Error en la Actualización',
            description: result.message,
            variant: 'destructive',
        });
    }
    setIsBackfilling(false);
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
            onBackfill={() => setIsBackfillDialogOpen(true)}
            isBackfilling={isBackfilling}
        />
      </div>
      <BackfillConfirmationDialog
        isOpen={isBackfillDialogOpen}
        onOpenChange={setIsBackfillDialogOpen}
        onConfirm={handleConfirmBackfill}
        isBackfilling={isBackfilling}
      />
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
