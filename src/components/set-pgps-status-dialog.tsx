
'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { updateUnitStatus } from '@/lib/unit-actions';
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

type SetPgpsStatusDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
  onSuccess: () => void;
};

export default function SetPgpsStatusDialog({
  isOpen,
  onOpenChange,
  unit,
  onSuccess,
}: SetPgpsStatusDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!unit) return null;

  const targetStatusIsSuspend = !unit.estaSuspendido;
  const actionText = targetStatusIsSuspend ? 'suspender' : 'activar';
  const variant = targetStatusIsSuspend ? 'destructive' : 'default';

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await updateUnitStatus(unit.id, unit.clientId, targetStatusIsSuspend);
      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message,
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
        description: `Ocurrió un error al intentar ${actionText} la unidad.`,
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
          <AlertDialogTitle>¿Estás seguro que deseas {actionText} esta unidad?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción cambiará el estado de la unidad con placa{' '}
            <span className="font-semibold">{unit.placa}</span>.
            {unit.pgpsDeviceId && ` También se ${actionText}á en la plataforma P. GPS.`}
            {actionText === 'suspender' && ' Se registrará la fecha de suspensión.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
                variant={variant}
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
