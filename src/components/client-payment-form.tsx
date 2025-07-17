'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ClientPaymentFormSchema, type ClientPaymentFormInput } from '@/lib/payment-schema';
import type { Unit } from '@/lib/unit-schema';
import type { Client } from '@/lib/schema';
import { registerPayment } from '@/lib/payment-actions';
import { getUnitsByClientId } from '@/lib/unit-actions';
import { useToast } from '@/hooks/use-toast';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

type ClientPaymentFormProps = {
  client: Omit<Client, 'placaVehiculo'>;
  onSave: () => void;
  onCancel: () => void;
};

export default function ClientPaymentForm({ client, onSave, onCancel }: ClientPaymentFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [units, setUnits] = React.useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = React.useState<Unit | null>(null);

  const form = useForm<ClientPaymentFormInput>({
    resolver: zodResolver(ClientPaymentFormSchema),
    defaultValues: {
      unitId: '',
      fechaPago: new Date(),
      numeroFactura: '',
      monto: 0,
      formaPago: 'transferencia',
      mesesPagados: 1,
    },
  });

  React.useEffect(() => {
    async function fetchUnits() {
      const clientUnits = await getUnitsByClientId(client.id);
      setUnits(clientUnits);
    }
    fetchUnits();
  }, [client.id]);

  const unitId = form.watch('unitId');
  const mesesPagados = form.watch('mesesPagados');

  React.useEffect(() => {
    const unit = units.find(u => u.id === unitId);
    setSelectedUnit(unit || null);
  }, [unitId, units]);

  React.useEffect(() => {
    if (selectedUnit) {
      const costoMensual = selectedUnit.costoMensual || 0;
      const total = costoMensual * (mesesPagados || 1);
      form.setValue('monto', total);
    } else {
      form.setValue('monto', 0);
    }
  }, [mesesPagados, selectedUnit, form]);

  async function onSubmit(values: ClientPaymentFormInput) {
    setIsSubmitting(true);
    try {
      const result = await registerPayment(values, values.unitId, client.id);
      if (result.success && result.unit) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
        onSave();
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
        description: 'Ocurrió un error inesperado al registrar el pago.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="unitId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidad (Placa)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={units.length === 0}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={units.length > 0 ? "Seleccione una unidad" : "Cliente sin unidades"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.placa} - {unit.modelo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fechaPago"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Pago</FormLabel>
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
            <FormField
              control={form.control}
              name="numeroFactura"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Factura</FormLabel>
                  <FormControl>
                    <Input placeholder="001-001-123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="mesesPagados"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cantidad de Meses</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} disabled={!selectedUnit} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="monto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto Total</FormLabel>
                <FormControl>
                  <Input type="number" {...field} readOnly className="bg-muted"/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="formaPago"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Forma de Pago</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una forma de pago" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedUnit}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
