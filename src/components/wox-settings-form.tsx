
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

import { WoxSettingsSchema, type WoxSettingsFormInput } from '@/lib/settings-schema';
import { getWoxSettings, saveWoxSettings } from '@/lib/settings-actions';

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

export default function WoxSettingsForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [permissionError, setPermissionError] = React.useState<string | null>(null);

  const form = useForm<WoxSettingsFormInput>({
    resolver: zodResolver(WoxSettingsSchema),
    defaultValues: {
      url: '',
      user: '',
      apiKey: '',
    },
  });

  React.useEffect(() => {
    async function loadSettings() {
      if (user?.role !== 'master') {
        setPermissionError('Acción no permitida. Se requiere rol de Master.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const settings = await getWoxSettings();
        if (settings) {
          form.reset({
              url: settings.url || '',
              user: settings.user || '',
              apiKey: settings.apiKey || '',
          });
        }
      } catch (error) {
        toast({
          title: 'Error al cargar',
          description: 'No se pudo cargar la configuración de WOX.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    if (user) {
      loadSettings();
    }
  }, [form, toast, user]);

  async function onSubmit(values: WoxSettingsFormInput) {
    if (user?.role !== 'master') {
      toast({
          title: 'Error de permisos',
          description: 'No tienes permiso para realizar esta acción.',
          variant: 'destructive',
        });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveWoxSettings(values);
      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
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

  if (permissionError) {
      return (
          <CardContent>
              <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Acceso Denegado</AlertTitle>
                  <AlertDescription>{permissionError}</AlertDescription>
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
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Servidor</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.wox.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario</FormLabel>
                  <FormControl>
                    <Input placeholder="usuario_api" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {(isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
        </CardFooter>
      </form>
    </FormProvider>
  );
}
