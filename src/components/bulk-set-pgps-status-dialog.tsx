
'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { bulkUpdateUnitPgpsStatus } from '@/lib/unit-actions';
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

type BulkSetPgpsStatusDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  units: Unit[];
  action: 'activate' | 'deactivate' | null;
  onSuccess: () => void;
};

export default function BulkSetPgpsStatusDialog({
  isOpen,
  onOpenChange,
  units,
  action,
  onSuccess,
}: BulkSetPgpsStatusDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!action || units.length === 0) return null;

  const targetStatusIsSuspend = action === 'deactivate';
  const actionText = targetStatusIsSuspend ? 'suspender' : 'activar';
  const variant = targetStatusIsSuspend ? 'destructive' : 'default';

  const handleSubmit = async () => {
    const unitsToUpdate = units
        .map(u => ({ unitId: u.id, clientId: u.clientId, pgpsDeviceId: u.pgpsDeviceId }));

    if (unitsToUpdate.length === 0) {
        toast({
            title: 'No hay unidades seleccionadas',
            description: 'No se ha seleccionado ninguna unidad para esta acción.',
            variant: 'destructive',
        });
        onOpenChange(false);
        return;
    }

    setIsSubmitting(true);
    try {
      const result = await bulkUpdateUnitPgpsStatus(unitsToUpdate, targetStatusIsSuspend);
      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
      } else {
        toast({
          title: 'Operación Parcial',
          description: result.message,
          variant: 'destructive',
        });
      }
      onSuccess();
    } catch (error) {
       toast({
        title: 'Error Inesperado',
        description: `Ocurrió un error al intentar ${actionText} las unidades en lote.`,
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
          <AlertDialogTitle>¿Estás seguro que deseas {actionText} las {units.length} unidades seleccionadas?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción cambiará el estado de las unidades seleccionadas. Las unidades vinculadas a P. GPS también se actualizarán en esa plataforma.
            {actionText === 'suspender' && ' Se registrará la fecha de suspensión para cada unidad.'}
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
