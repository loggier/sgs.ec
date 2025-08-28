

'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { PaymentFormSchema, type PaymentFormInput } from '@/lib/payment-schema';
import type { Unit } from '@/lib/unit-schema';
import { registerPayment } from '@/lib/payment-actions';
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

type PaymentFormProps = {
  unit: Unit;
  clientId: string;
  onSave: () => void;
  onCancel: () => void;
};

export default function PaymentForm({ unit, clientId, onSave, onCancel }: PaymentFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const getMonthlyCost = (unit: Unit) => {
    return unit.tipoContrato === 'con_contrato'
      ? (unit.costoTotalContrato ?? 0) / (unit.mesesContrato ?? 1)
      : unit.costoMensual ?? 0;
  }
  const monthlyCost = getMonthlyCost(unit);

  const form = useForm<PaymentFormInput>({
    resolver: zodResolver(PaymentFormSchema),
    defaultValues: {
      fechaPago: new Date(),
      numeroFactura: '',
      monto: monthlyCost,
      formaPago: 'transferencia',
      mesesPagados: 1,
    },
  });

  const mesesPagados = form.watch('mesesPagados');

  React.useEffect(() => {
    const total = (monthlyCost * (mesesPagados || 1));
    form.setValue('monto', total);
  }, [mesesPagados, monthlyCost, form]);

  async function onSubmit(values: PaymentFormInput) {
    setIsSubmitting(true);
    try {
      // Pass the explicit clientId prop instead of unit.clientId
      const result = await registerPayment(values, [unit.id], clientId);
      if (result.success && result.units?.length) {
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
        title: 'Error Inesperado',
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
                   <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)} />
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
                {unit && <p className="text-xs text-muted-foreground pt-1">Costo mensual: {new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(monthlyCost)}</p>}
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
