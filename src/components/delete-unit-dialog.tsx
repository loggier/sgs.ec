
'use client';

import * as React from 'react';
import Modal from 'react-modal';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import type { Unit } from '@/lib/unit-schema';
import { AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';


type DeleteUnitDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
  onConfirm: () => Promise<void>;
};

if (typeof window !== 'undefined') {
  Modal.setAppElement('body');
}

export default function DeleteUnitDialog({
  isOpen,
  onOpenChange,
  unit,
  onConfirm,
}: DeleteUnitDialogProps) {
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
                <h2 className="text-lg font-semibold leading-none tracking-tight">¿Estás seguro?</h2>
                <p className="text-sm text-muted-foreground">
                    Esta acción no se puede deshacer. Esto eliminará permanentemente la unidad con placa{' '}
                    <span className="font-semibold">{unit?.placa}</span>.
                </p>
            </div>
            <AlertDialogFooter className="mt-4">
                <AlertDialogCancel disabled={isDeleting} onClick={() => onOpenChange(false)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction asChild>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isDeleting ? "Eliminando..." : "Eliminar"}
                    </Button>
                </AlertDialogAction>
            </AlertDialogFooter>
        </div>
    </Modal>
  );
}
