
'use client';

import * as React from 'react';
import Modal from 'react-modal';
import { useToast } from '@/hooks/use-toast';
import type { ClientDisplay } from '@/lib/schema';
import { Button } from './ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { QyvooMessageSchema, type QyvooMessageFormInput } from '@/lib/notification-schema';
import { getNotificationUrlForUser } from '@/lib/settings-actions';
import { sendNotificationMessage } from '@/lib/notification-actions';
import { type NotificationSettings } from '@/lib/settings-schema';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

type SendMessageDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientDisplay | null;
};

if (typeof window !== 'undefined') {
  Modal.setAppElement('body');
}

export default function SendMessageDialog({
  isOpen,
  onOpenChange,
  client,
}: SendMessageDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [notificationSettings, setNotificationSettings] = React.useState<NotificationSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);

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
      setIsLoadingSettings(true);
      setNotificationSettings(null);
    } else if (client?.ownerId) {
      setIsLoadingSettings(true);
      getNotificationUrlForUser(client.ownerId)
        .then(setNotificationSettings)
        .finally(() => setIsLoadingSettings(false));
    }
  }, [isOpen, client, form]);

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
      const logMetadata = { 
        ownerId: client.ownerId, 
        clientId: client.id!, 
        clientName: client.nomSujeto 
      };
      const result = await sendNotificationMessage(
          client.telefono, 
          values.message, 
          notificationSettings,
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

  const renderContent = () => {
    if (isLoadingSettings) {
      return (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (!notificationSettings?.notificationUrl) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configuración Requerida</AlertTitle>
          <AlertDescription>
            El propietario de este cliente no tiene una URL de notificaciones configurada. Por favor, vaya a la sección de <strong>Configuración</strong> para añadirla.
          </AlertDescription>
        </Alert>
      );
    }

    return (
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
    );
  };

  return (
    <Modal
        isOpen={isOpen}
        onRequestClose={() => onOpenChange(false)}
        className="fixed inset-0 flex items-center justify-center p-4"
        overlayClassName="fixed inset-0 bg-black/50"
        contentLabel="Enviar Mensaje"
    >
        <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-lg">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                <h2 className="text-lg font-semibold leading-none tracking-tight">Enviar mensaje a {client.nomSujeto}</h2>
                <p className="text-sm text-muted-foreground">
                    El mensaje se enviará al número {client.telefono} a través del servicio de notificaciones configurado.
                </p>
            </div>
            {renderContent()}
        </div>
    </Modal>
  );
}
