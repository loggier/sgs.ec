
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import { PaymentFormSchema } from '@/lib/payment-schema';
import type { Unit } from '@/lib/unit-schema';
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
import { MultiSelectCombobox } from './ui/multi-select-combobox';


type ClientPaymentFormProps = {
  clientId: string;
  clientName: string;
  onSave: () => void;
  onCancel: () => void;
};

// Adjust schema for multiple unit IDs
const BatchPaymentFormSchema = PaymentFormSchema.extend({
    unitIds: z.array(z.string()).min(1, 'Debe seleccionar al menos una unidad.'),
});
type BatchPaymentFormInput = z.infer<typeof BatchPaymentFormSchema>;


export default function ClientPaymentForm({ clientId, clientName, onSave, onCancel }: ClientPaymentFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [units, setUnits] = React.useState<Unit[]>([]);

  const form = useForm<BatchPaymentFormInput>({
    resolver: zodResolver(BatchPaymentFormSchema),
    defaultValues: {
      unitIds: [],
      fechaPago: new Date(),
      numeroFactura: '',
      monto: 0,
      formaPago: 'transferencia',
      mesesPagados: 1,
    },
  });

  React.useEffect(() => {
    async function fetchUnits() {
      const clientUnits = await getUnitsByClientId(clientId);
      setUnits(clientUnits);
    }
    fetchUnits();
  }, [clientId]);

  const unitIds = form.watch('unitIds');
  const mesesPagados = form.watch('mesesPagados');

  React.useEffect(() => {
    if (unitIds.length === 0 || units.length === 0) {
      form.setValue('monto', 0);
      return;
    }
    
    const totalMonthlyCost = unitIds.reduce((total, id) => {
        const unit = units.find(u => u.id === id);
        if (unit) {
            const monthlyCost = unit.tipoContrato === 'con_contrato'
                ? (unit.costoTotalContrato ?? 0) / (unit.mesesContrato ?? 1)
                : unit.costoMensual ?? 0;
            return total + monthlyCost;
        }
        return total;
    }, 0);

    const totalAmount = totalMonthlyCost * (mesesPagados || 1);
    form.setValue('monto', totalAmount);
    
  }, [unitIds, mesesPagados, units, form]);
  
  const unitOptions = units.map(unit => ({
    value: unit.id,
    label: unit.modelo ? `${unit.placa} - ${unit.modelo}` : unit.placa,
  }));
  
  async function onSubmit(values: BatchPaymentFormInput) {
    console.log('[CLIENT] Clic en "Registrar Pagos". Valores del formulario:', values);
    setIsSubmitting(true);
    try {
      // The action now handles an array of unitIds
      const result = await registerPayment(values, values.unitIds, clientId);
      console.log('[CLIENT] Respuesta recibida del servidor:', result);

      if (result.success) {
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
       console.error('[CLIENT] Error al llamar a registerPayment:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado al registrar los pagos.',
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
          name="unitIds"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Unidades (Placas)</FormLabel>
               <MultiSelectCombobox
                  options={unitOptions}
                  selected={field.value}
                  onChange={field.onChange}
                  placeholder="Seleccione una o más unidades"
                  searchPlaceholder="Buscar placa o modelo..."
                  emptyPlaceholder="No se encontraron unidades."
                  disabled={units.length === 0}
              />
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
                  <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)} disabled={unitIds.length === 0} />
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
                <FormLabel>Monto Total Agregado</FormLabel>
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
          <Button type="submit" disabled={isSubmitting || unitIds.length === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Registrando...' : 'Registrar Pagos'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
