
'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ClientDisplay } from '@/lib/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { z } from 'zod';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { QyvooMessageSchema, type QyvooMessageFormInput } from '@/lib/qyvoo-schema';
import { getQyvooSettingsForUser } from '@/lib/settings-actions';
import { sendQyvooMessage } from '@/lib/qyvoo-actions';

type SendQyvooMessageDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientDisplay | null;
};

export default function SendQyvooMessageDialog({
  isOpen,
  onOpenChange,
  client,
}: SendQyvooMessageDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<QyvooMessageFormInput>({
    resolver: zodResolver(QyvooMessageSchema),
    defaultValues: {
      message: '',
    },
  });

  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
      setIsSubmitting(false);
    }
  }, [isOpen, form]);

  if (!client) return null;

  async function onSubmit(values: QyvooMessageFormInput) {
    if (!client?.telefono) {
        toast({ title: 'Error', description: 'El cliente no tiene un número de teléfono.', variant: 'destructive'});
        return;
    }
     if (!client?.ownerId) {
        toast({ title: 'Error', description: 'El cliente no tiene un propietario asignado.', variant: 'destructive'});
        return;
    }

    setIsSubmitting(true);
    try {
      const settings = await getQyvooSettingsForUser(client.ownerId);
      const logMetadata = { 
        ownerId: client.ownerId, 
        clientId: client.id!, 
        clientName: client.nomSujeto 
      };
      const result = await sendQyvooMessage(
          client.telefono, 
          values.message, 
          settings,
          logMetadata
      );
      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
        onOpenChange(false);
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
        description: 'Ocurrió un error al intentar enviar el mensaje.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar mensaje a {client.nomSujeto}</DialogTitle>
          <DialogDescription>
            El mensaje se enviará al número {client.telefono} a través de WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Mensaje</FormLabel>
                        <FormControl>
                            <Textarea
                            placeholder="Escriba su mensaje aquí..."
                            className="resize-none"
                            rows={5}
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
                    </Button>
                </div>
            </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
