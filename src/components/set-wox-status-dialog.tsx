
'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { setWoxDeviceStatus } from '@/lib/wox-actions';
import type { Unit } from '@/lib/unit-schema';
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

type SetWoxStatusDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
  onSuccess: () => void;
};

export default function SetWoxStatusDialog({
  isOpen,
  onOpenChange,
  unit,
  onSuccess,
}: SetWoxStatusDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!unit) return null;

  const targetStatus = !unit.woxDeviceActive;
  const actionText = targetStatus ? 'activar' : 'desactivar';

  const handleSubmit = async () => {
    if (!unit.woxDeviceId) return;

    setIsSubmitting(true);
    try {
      const result = await setWoxDeviceStatus(unit.woxDeviceId, targetStatus);
      if (result.success) {
        toast({
          title: 'Éxito',
          description: `Dispositivo ${unit.placa} ${actionText === 'activar' ? 'activado' : 'desactivado'} en WOX con éxito.`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
       toast({
        title: 'Error Inesperado',
        description: `Ocurrió un error al intentar ${actionText} el dispositivo.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro que deseas {actionText} el dispositivo?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción cambiará el estado del dispositivo con placa{' '}
            <span className="font-semibold">{unit.placa}</span> (IMEI: {unit.imei}) en la plataforma WOX.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
                variant={targetStatus ? "default" : "destructive"}
                onClick={handleSubmit}
                disabled={isSubmitting}
            >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Procesando..." : `Confirmar y ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
