
'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { bulkDeleteUnits } from '@/lib/unit-actions';
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
import { useAuth } from '@/context/auth-context';

type BulkDeleteUnitDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  units: Unit[];
  onSuccess: () => void;
};

export default function BulkDeleteUnitDialog({
  isOpen,
  onOpenChange,
  units,
  onSuccess,
}: BulkDeleteUnitDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!user || units.length === 0) return;
    
    const unitsToDelete = units.map(u => ({ unitId: u.id, clientId: u.clientId }));

    setIsDeleting(true);
    try {
      const result = await bulkDeleteUnits(unitsToDelete, user);
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
        description: 'Ocurrió un error al intentar eliminar las unidades en lote.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Esto eliminará permanentemente las{' '}
            <span className="font-semibold">{units.length}</span> unidades seleccionadas.
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
                {isDeleting ? "Eliminando..." : "Eliminar Lote"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
