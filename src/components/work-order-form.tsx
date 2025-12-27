
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { WorkOrderSchema, type WorkOrderFormInput, type WorkOrder, WorkOrderPriority } from '@/lib/work-order-schema';
import { saveWorkOrder } from '@/lib/work-order-actions';
import { getUsers } from '@/lib/user-actions';
import type { User } from '@/lib/user-schema';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

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
import { Textarea } from './ui/textarea';
import { Combobox } from './ui/combobox';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';

type WorkOrderFormProps = {
  order: WorkOrder | null;
  onSave: () => void;
  onCancel: () => void;
};

export default function WorkOrderForm({ order, onSave, onCancel }: WorkOrderFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [technicians, setTechnicians] = React.useState<User[]>([]);

  const form = useForm<WorkOrderFormInput>({
    resolver: zodResolver(WorkOrderSchema.omit({id: true})),
    defaultValues: order
      ? {
          ...order,
          fechaProgramada: new Date(order.fechaProgramada),
        }
      : {
          placaVehiculo: '',
          nombreCliente: '',
          ciudad: '',
          ubicacionGoogleMaps: '',
          numeroCliente: '',
          tecnicoId: '',
          prioridad: 'media',
          descripcion: '',
          fechaProgramada: new Date(),
          estado: 'pendiente',
        },
  });

  React.useEffect(() => {
    if (user) {
        getUsers(user).then(allUsers => {
            const techUsers = allUsers.filter(u => u.role === 'tecnico');
            setTechnicians(techUsers);
        });
    }
  }, [user]);
  
  const technicianOptions = technicians.map(t => ({
      value: t.id,
      label: t.nombre || t.username,
  }));

  async function onSubmit(values: WorkOrderFormInput) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const result = await saveWorkOrder(values, user, order?.id);
      if (result.success) {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="nombreCliente"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre del Cliente</FormLabel>
                    <FormControl>
                        <Input placeholder="Juan Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="numeroCliente"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Número del Cliente</FormLabel>
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
                name="placaVehiculo"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Placa del Vehículo</FormLabel>
                    <FormControl>
                        <Input placeholder="PCQ-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
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
            </div>

            <FormField
              control={form.control}
              name="ubicacionGoogleMaps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación (URL de Google Maps)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://maps.app.goo.gl/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
             <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción de la Tarea</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describa el trabajo a realizar..." rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="tecnicoId"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Técnico Asignado</FormLabel>
                    <Combobox 
                        options={technicianOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Seleccione un técnico..."
                        searchPlaceholder='Buscar técnico...'
                        emptyPlaceholder='No se encontraron técnicos.'
                        disabled={technicians.length === 0}
                    />
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="prioridad"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione una prioridad" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {WorkOrderPriority.options.map(p => (
                            <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

             <FormField
              control={form.control}
              name="fechaProgramada"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha Programada</FormLabel>
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
        </ScrollArea>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Guardando...' : 'Guardar Orden'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

