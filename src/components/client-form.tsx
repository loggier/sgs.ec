
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

import { ClientSchema, type ClientDisplay } from '@/lib/schema';
import { saveClient } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

type ClientFormProps = {
  client: ClientDisplay | null;
  onSave: () => void;
  onCancel: () => void;
};

export default function ClientForm({ client, onSave, onCancel }: ClientFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const form = useForm<Omit<ClientDisplay, 'id'>>({
    resolver: zodResolver(ClientSchema.omit({id: true, ownerId: true})),
    defaultValues: client
      ? {
          codTipoId: client.codTipoId ?? 'C',
          codIdSujeto: client.codIdSujeto ?? '',
          nomSujeto: client.nomSujeto ?? '',
          direccion: client.direccion ?? '',
          ciudad: client.ciudad ?? '',
          telefono: client.telefono ?? '',
          usuario: client.usuario ?? '',
          estado: client.estado ?? 'al dia',
        }
      : {
          codTipoId: 'C',
          codIdSujeto: '',
          nomSujeto: '',
          direccion: '',
          ciudad: '',
          telefono: '',
          usuario: '',
          estado: 'al dia',
        },
  });

  async function onSubmit(values: Omit<ClientDisplay, 'id'>) {
    if (!user) {
        toast({
            title: 'Error de autenticación',
            description: 'No se pudo identificar al usuario. Por favor, inicie sesión de nuevo.',
            variant: 'destructive',
        });
        return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await saveClient(values, user.id, client?.id);
      if (result.success && result.client) {
          toast({ title: 'Éxito', description: result.message });
          onSave();
      } else {
          toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Ocurrió un error inesperado.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="nomSujeto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre (Cliente)</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codTipoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de ID</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="C">Cédula</SelectItem>
                        <SelectItem value="R">RUC</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="codIdSujeto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cédula o RUC</FormLabel>
                    <FormControl>
                      <Input placeholder="1712345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Amazonas N34-451 y Av. Atahualpa" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ciudad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input placeholder="Quito" {...field} value={field.value ?? ''}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="0991234567" {...field} value={field.value ?? ''}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
             <FormField
              control={form.control}
              name="usuario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario (API - Email de WOX)</FormLabel>
                  <FormControl>
                    <Input placeholder="cliente@email.com" {...field} value={field.value ?? ''}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="al dia">Al día</SelectItem>
                      <SelectItem value="adeuda">Adeuda</SelectItem>
                      <SelectItem value="retirado">Retirado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
