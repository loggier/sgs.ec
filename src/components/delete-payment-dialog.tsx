
'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { deletePayment } from '@/lib/payment-actions';
import type { PaymentHistoryEntry } from '@/lib/payment-schema';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

type DeletePaymentDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentHistoryEntry | null;
  onDelete: () => void;
};

export default function DeletePaymentDialog({
  isOpen,
  onOpenChange,
  payment,
  onDelete,
}: DeletePaymentDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!payment) return;

    setIsDeleting(true);
    try {
      const result = await deletePayment(payment.id, payment.clientId, payment.unitId);
      onOpenChange(false);
      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
        onDelete();
      } else {
        toast({
          title: 'Error al eliminar',
          description: result.message, // This will now show the detailed error from the server
          variant: 'destructive',
        });
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado al eliminar el pago.';
       toast({
        title: 'Error Inesperado',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Esto eliminará permanentemente el pago con factura{' '}
            <span className="font-semibold">{payment?.numeroFactura}</span> para la unidad{' '}
            <span className="font-semibold">{payment?.unitPlaca}</span>. El estado de la unidad se revertirá a su estado anterior.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
            >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isDeleting ? "Eliminando..." : "Confirmar Eliminación"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
