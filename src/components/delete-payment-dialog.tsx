
'use client';

import * as React from 'react';
import Modal from 'react-modal';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import type { PaymentHistoryEntry } from '@/lib/payment-schema';

type DeletePaymentDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentHistoryEntry | null;
  onConfirm: () => Promise<void>;
};

if (typeof window !== 'undefined') {
    Modal.setAppElement('body');
}

export default function DeletePaymentDialog({
  isOpen,
  onOpenChange,
  payment,
  onConfirm,
}: DeletePaymentDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
  };
  
  React.useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false);
    }
  }, [isOpen]);

  return (
    <Modal
        isOpen={isOpen}
        onRequestClose={() => onOpenChange(false)}
        className="fixed inset-0 flex items-center justify-center p-4 bg-black/50"
        overlayClassName="fixed inset-0 bg-black/50"
        contentLabel="Confirmar Eliminación"
    >
        <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-lg">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                <h2 className="text-lg font-semibold leading-none tracking-tight">¿Estás realmente seguro?</h2>
                <p className="text-sm text-muted-foreground">
                    Esta acción no se puede deshacer. Esto eliminará permanentemente el pago con factura{' '}
                    <span className="font-semibold">{payment?.numeroFactura}</span> para la unidad{' '}
                    <span className="font-semibold">{payment?.unitPlaca}</span>. El estado de la unidad se revertirá a su estado anterior.
                </p>
            </div>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                <Button variant="outline" disabled={isDeleting} onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button
                    variant="destructive"
                    onClick={handleConfirm}
                    disabled={isDeleting}
                >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isDeleting ? "Eliminando..." : "Confirmar Eliminación"}
                </Button>
            </div>
        </div>
    </Modal>
  );
}
