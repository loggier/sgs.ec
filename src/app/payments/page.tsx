
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
import BackfillConfirmationDialog from '@/components/backfill-confirmation-dialog';

function PaymentsPageContent({ 
    payments, 
    isLoading, 
    isBackfilling,
    onDataChange, 
    onBackfill 
}: { 
    payments: PaymentHistoryEntry[], 
    isLoading: boolean, 
    isBackfilling: boolean,
    onDataChange: () => void,
    onBackfill: () => void,
}) {
  const { user } = useAuth();
  
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
        <NewPaymentSection onPaymentSaved={onDataChange} />
        <PaymentHistoryList 
            initialPayments={payments} 
            isLoading={isLoading}
            isBackfilling={isBackfilling}
            onBackfill={onBackfill}
            onPaymentDeleted={onDataChange}
        />
      </div>
    </>
  );
}


export default function PaymentsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [payments, setPayments] = React.useState<PaymentHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isBackfilling, setIsBackfilling] = React.useState(false);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);

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

    const handleBackfillClick = () => {
        setIsConfirmDialogOpen(true);
    };

    const confirmBackfill = async () => {
        setIsBackfilling(true);
        toast({
        title: 'Iniciando actualización...',
        description: 'Este proceso puede tardar varios minutos. No cierres esta ventana.',
        });
        
        const result = await backfillPaymentOwnerIds();
        
        if (result.success) {
        toast({
            title: 'Actualización completada',
            description: result.message,
        });
        } else {
        toast({
            title: 'Error en la actualización',
            description: result.message,
            variant: 'destructive',
        });
        }
        setIsBackfilling(false);
    };

    return (
        <AppContent>
            <PaymentsPageContent 
                payments={payments}
                isLoading={isLoading}
                isBackfilling={isBackfilling}
                onDataChange={fetchPayments}
                onBackfill={handleBackfillClick}
            />
            <BackfillConfirmationDialog
                isOpen={isConfirmDialogOpen}
                onOpenChange={setIsConfirmDialogOpen}
                isBackfilling={isBackfilling}
                onConfirm={confirmBackfill}
            />
        </AppContent>
    )
}
