
'use client';

import * as React from 'react';
import Modal from 'react-modal';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

type ClearLogsDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

// Set the app element for react-modal
if (typeof window !== 'undefined') {
  Modal.setAppElement('body');
}

export default function ClearLogsDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: ClearLogsDialogProps) {
  const [isClearing, setIsClearing] = React.useState(false);

  const handleConfirm = async () => {
    setIsClearing(true);
    await onConfirm();
  };

  React.useEffect(() => {
    if (!isOpen) {
      setIsClearing(false);
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
                <h2 className="text-lg font-semibold leading-none tracking-tight">¿Estás absolutamente seguro?</h2>
                <p className="text-sm text-muted-foreground">
                    Esta acción no se puede deshacer. Esto eliminará permanentemente todos los registros
                    de notificaciones enviadas. Esta información es útil para auditorías y no se podrá recuperar.
                </p>
            </div>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                <Button variant="outline" disabled={isClearing} onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button
                    variant="destructive"
                    onClick={handleConfirm}
                    disabled={isClearing}
                >
                    {isClearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isClearing ? "Eliminando..." : "Sí, eliminar todo"}
                </Button>
            </div>
        </div>
    </Modal>
  );
}
