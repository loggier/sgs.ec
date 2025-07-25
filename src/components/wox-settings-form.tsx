
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function WoxSettingsForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
      setIsLoading(true);
      const settings = await getWoxSettings();
      if (settings) {
        form.reset({
            url: settings.url || '',
            user: settings.user || '',
            apiKey: settings.apiKey || '',
        });
      }
      setIsLoading(false);
    }
    loadSettings();
  }, [form]);

  async function onSubmit(values: WoxSettingsFormInput) {
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
        </CardFooter>
      </form>
    </FormProvider>
  );
}
