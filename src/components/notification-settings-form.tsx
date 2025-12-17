
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

import { NotificationSettingsSchema, type NotificationSettingsFormInput } from '@/lib/settings-schema';
import { saveNotificationUrl } from '@/lib/settings-actions';

import { Button } from '@/components/ui/button';
import { CardContent, CardFooter } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function NotificationSettingsForm() {
  const { toast } = useToast();
  const { user, updateUserContext } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<NotificationSettingsFormInput>({
    resolver: zodResolver(NotificationSettingsSchema),
    defaultValues: {
      notificationUrl: '',
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        notificationUrl: user.notificationUrl || '',
      });
    }
  }, [form, user]);

  async function onSubmit(values: NotificationSettingsFormInput) {
    if (!user || !user.id) {
      toast({
        title: 'Error de autenticación',
        description: 'No se puede guardar la configuración sin un usuario.',
        variant: 'destructive',
      });
      return;
    }

    if (!['master', 'manager'].includes(user.role)) {
      toast({
        title: 'Error de permisos',
        description: 'Solo los usuarios Master o Manager pueden guardar la configuración de notificaciones.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveNotificationUrl(user.id, values);
      if (result.success && result.user) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
        updateUserContext(result.user);
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
        description: 'Ocurrió un error inesperado al guardar la configuración.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (user && !['master', 'manager'].includes(user.role)) {
    return (
        <CardContent>
            <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Función no disponible</AlertTitle>
                <AlertDescription>
                    Los usuarios con su rol no gestionan la URL de notificaciones.
                    Las notificaciones se enviarán con la configuración de su Manager.
                </AlertDescription>
            </Alert>
        </CardContent>
    )
  }

  if (isLoading) {
    return (
        <CardContent>
            <div className="space-y-4 mt-6">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-10 w-full" />
            </div>
        </CardContent>
    )
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="notificationUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL para Notificaciones</FormLabel>
                  <FormControl>
                    <Input placeholder="http://version2.gpsplataforma.net:4000/api/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {(isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Guardando...' : 'Guardar URL de Notificaciones'}
            </Button>
        </CardFooter>
      </form>
    </FormProvider>
  );
}
