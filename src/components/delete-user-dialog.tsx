
'use client';

import * as React from 'react';
import Modal from 'react-modal';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import type { User } from '@/lib/user-schema';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';


type DeleteUserDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: () => Promise<void>;
};

if (typeof window !== 'undefined') {
  Modal.setAppElement('body');
}

export default function DeleteUserDialog({
  isOpen,
  onOpenChange,
  user,
  onConfirm,
}: DeleteUserDialogProps) {
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
            <DialogHeader>
                <DialogTitle>¿Estás realmente seguro?</DialogTitle>
                <DialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario{' '}
                    <span className="font-semibold">{user?.username}</span> y todos sus datos asociados.
                </DialogDescription>
            </DialogHeader>
            <AlertDialogFooter className="mt-4">
                <AlertDialogCancel disabled={isDeleting} onClick={() => onOpenChange(false)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction asChild>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isDeleting ? "Eliminando..." : "Confirmar Eliminación"}
                    </Button>
                </AlertDialogAction>
            </AlertDialogFooter>
        </div>
    </Modal>
  );
}
