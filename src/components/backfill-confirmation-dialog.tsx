
'use client';

import * as React from 'react';
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

type BackfillConfirmationDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isBackfilling: boolean;
  onConfirm: () => void;
};

export default function BackfillConfirmationDialog({
  isOpen,
  onOpenChange,
  isBackfilling,
  onConfirm,
}: BackfillConfirmationDialogProps) {

  const handleConfirm = () => {
    onConfirm();
    // The dialog will be closed by the parent component changing its state
    // but we can explicitly close it here if needed, though it's better controlled by parent.
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmar Actualización de Datos?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción recorrerá todos los pagos existentes en la base de datos para añadirles
            la etiqueta del propietario. Este proceso es necesario para futuras optimizaciones de
            rendimiento y es seguro de ejecutar. Puede tardar varios minutos dependiendo
            de la cantidad de registros.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBackfilling}>Cancelar</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
                onClick={handleConfirm}
                disabled={isBackfilling}
            >
                {isBackfilling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isBackfilling ? "Actualizando..." : "Confirmar Actualización"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
