
'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { deleteUnit } from '@/lib/unit-actions';
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

type DeleteUnitDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
  clientId: string;
  onDelete: () => void;
};

export default function DeleteUnitDialog({
  isOpen,
  onOpenChange,
  unit,
  clientId,
  onDelete,
}: DeleteUnitDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!unit || !user) return;

    setIsDeleting(true);
    try {
      const result = await deleteUnit(unit.id, clientId, user);
      
      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
        onDelete();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
       toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado.',
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
            Esta acción no se puede deshacer. Esto eliminará permanentemente la unidad con placa{' '}
            <span className="font-semibold">{unit?.placa}</span>.
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
                {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
