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

type SendRemindersDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSending: boolean;
};

export default function SendRemindersDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isSending,
}: SendRemindersDialogProps) {

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmar envío masivo de recordatorios?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción buscará todas las unidades con pagos próximos a vencer, vencidos hoy o con mora, y enviará un recordatorio de pago por WhatsApp a los clientes correspondientes.
            Este proceso puede tardar unos momentos. ¿Desea continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSending}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSending ? 'Enviando...' : 'Sí, Enviar Recordatorios'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
