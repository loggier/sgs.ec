'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ClientSchema, type Client } from '@/lib/schema';
import { saveClient } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormDescription,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';

type ClientFormProps = {
  client: Omit<Client, 'placaVehiculo'> | null;
  onSave: (result: { client?: Client }) => void;
  onCancel: () => void;
};

const formSchema = ClientSchema.omit({ id: true, ownerId: true });
type FormSchemaType = z.infer<typeof formSchema>;

export default function ClientForm({ client, onSave, onCancel }: ClientFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: client
      ? {
          ...client,
          fecConcesion: client.fecConcesion ? new Date(client.fecConcesion) : null,
          fecVencimiento: client.fecVencimiento ? new Date(client.fecVencimiento) : null,
          valOperacion: client.valOperacion ?? '',
          valorPago: client.valorPago ?? '',
          valorVencido: client.valorVencido ?? '',
          ciudad: client.ciudad ?? '',
          telefono: client.telefono ?? '',
          usuario: client.usuario ?? '',
        }
      : {
          codTipoId: 'C',
          codIdSujeto: '',
          nomSujeto: '',
          direccion: '',
          ciudad: '',
          telefono: '',
          numOperacion: '',
          usuario: '',
          estado: 'al dia',
        },
  });

  async function onSubmit(values: FormSchemaType) {
    setIsSubmitting(true);
    try {
      const result = await saveClient(values, client?.id);
      if (result.success) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
        onSave({ client: result.client });
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
                    <Input placeholder="Av. Amazonas N34-451 y Av. Atahualpa" {...field} />
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
                      <Input placeholder="Quito" {...field} />
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
                      <Input placeholder="0991234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="numOperacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Operación</FormLabel>
                    <FormControl>
                      <Input placeholder="OP-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="usuario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario (API)</FormLabel>
                    <FormControl>
                      <Input placeholder="usuario_api" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fecConcesion"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Concesión</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: es })
                              ) : (
                                <span>Elige una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fecVencimiento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Vencimiento</FormLabel>
                       <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: es })
                              ) : (
                                <span>Elige una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="valOperacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor de Operación</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="5000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="valorPago"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor del Pago</FormLabel>
                        <FormControl>
                           <Input type="number" placeholder="5000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
             </div>
             
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="valorVencido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Vencido</FormLabel>
                        <FormControl>
                           <Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} />
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
