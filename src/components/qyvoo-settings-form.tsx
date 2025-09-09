
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

import { QyvooSettingsSchema, type QyvooSettingsFormInput } from '@/lib/settings-schema';
import { saveQyvooSettings } from '@/lib/settings-actions';

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

export default function QyvooSettingsForm() {
  const { toast } = useToast();
  const { user, updateUserContext } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<QyvooSettingsFormInput>({
    resolver: zodResolver(QyvooSettingsSchema),
    defaultValues: {
      apiKey: '',
      userId: '',
    },
  });

  React.useEffect(() => {
    // Load settings from the logged-in user's data
    if (user) {
      form.reset({
        apiKey: user.qyvooApiKey || '',
        userId: user.qyvooUserId || '',
      });
    }
  }, [form, user]);

  async function onSubmit(values: QyvooSettingsFormInput) {
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
        description: 'Solo los usuarios Master o Manager pueden guardar la configuración de QV.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveQyvooSettings(user.id, values);
      if (result.success && result.user) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
        // Update user in context to reflect the new settings
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
                    Los usuarios con su rol no gestionan credenciales de QV.
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
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>QV API Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>QV User ID</FormLabel>
                  <FormControl>
                    <Input placeholder="ID de usuario de QV" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {(isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Configuración de QV'}
            </Button>
        </CardFooter>
      </form>
    </FormProvider>
  );
}
