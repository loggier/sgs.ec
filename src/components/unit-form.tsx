
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { UnitFormSchema, type Unit, type UnitFormInput } from '@/lib/unit-schema';
import { saveUnit } from '@/lib/unit-actions';
import { getClients } from '@/lib/actions';
import type { ClientWithOwner } from '@/lib/schema';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from './ui/textarea';
import { Combobox } from './ui/combobox';

type UnitFormProps = {
  unit: Unit | null;
  clientId?: string; // Optional: provided when adding/editing from a client's page
  onSave: () => void;
  onCancel: () => void;
};

const planDisplayNames: Record<z.infer<typeof UnitFormSchema>['tipoPlan'], string> = {
  'estandar-sc': 'Estándar SC',
  'avanzado-sc': 'Avanzado SC',
  'total-sc': 'Total SC',
  'estandar-cc': 'Estándar CC',
  'avanzado-cc': 'Avanzado CC',
  'total-cc': 'Total CC',
};

const contractTypeDisplayNames: Record<z.infer<typeof UnitFormSchema>['tipoContrato'], string> = {
  'sin_contrato': 'Sin Contrato',
  'con_contrato': 'Con Contrato',
};

function UnitFormFields({ showClientSelector, isEditing }: { showClientSelector: boolean, isEditing: boolean }) {
  const { control, setValue } = useFormContext<UnitFormInput>();
  const tipoContrato = useWatch({
    control,
    name: 'tipoContrato',
  });

  const { user } = useAuth();
  const [clients, setClients] = React.useState<ClientWithOwner[]>([]);

  React.useEffect(() => {
    if (showClientSelector && user) {
      getClients(user.id, user.role).then(setClients);
    }
  }, [showClientSelector, user]);
  
  const clientOptions = clients.map(c => ({
    value: c.id!,
    label: `${c.nomSujeto} (${c.codIdSujeto})`,
  }));

  React.useEffect(() => {
    if (isEditing) return; // Don't auto-set values when editing

    if (tipoContrato === 'sin_contrato') {
      setValue('costoTotalContrato', undefined);
      setValue('mesesContrato', undefined);
    } else if (tipoContrato === 'con_contrato') {
      setValue('costoMensual', undefined);
    }
  }, [tipoContrato, setValue, isEditing]);
  
  return (
    <div className="space-y-4 py-4">
      {showClientSelector && (
        <FormField
          control={control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
                <Combobox
                  options={clientOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Seleccione un cliente..."
                  searchPlaceholder="Buscar cliente por nombre o ID..."
                  disabled={clients.length === 0}
                />
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="placa"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Placa</FormLabel>
              <FormControl>
                <Input placeholder="PCQ-1234" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="imei"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IMEI</FormLabel>
              <FormControl>
                <Input placeholder="123456789012345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        control={control}
        name="modelo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Modelo</FormLabel>
            <FormControl>
              <Input placeholder="Ej. Rastreador GPS 4G" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
          control={control}
          name="tipoPlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Plan</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un plan" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(planDisplayNames).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="tipoContrato"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Contrato</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un tipo de contrato" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                   {Object.entries(contractTypeDisplayNames).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                   ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      {tipoContrato === 'sin_contrato' && (
        <FormField
          control={control}
          name="costoMensual"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Costo Mensual</FormLabel>
              <FormControl>
                <Input type="number" placeholder="25.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {tipoContrato === 'con_contrato' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="costoTotalContrato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo Total del Contrato</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="300.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="mesesContrato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meses de Contrato</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="12" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="fechaInicioContrato"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Inicio de Contrato</FormLabel>
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
                          format(new Date(field.value), 'PPP', { locale: es })
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
                      selected={field.value as Date}
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
          {isEditing && (
             <FormField
                control={control}
                name="fechaVencimiento"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Vencimiento de Contrato</FormLabel>
                    <FormControl>
                      <Input
                        readOnly
                        value={field.value ? format(new Date(field.value), 'PPP', { locale: es }) : 'N/A'}
                        className="bg-muted cursor-default"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          )}
        </div>
      
      {isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="ultimoPago"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Último Pago</FormLabel>
                  <FormControl>
                    <Input
                      readOnly
                      value={field.value ? format(new Date(field.value), 'PPP', { locale: es }) : 'N/A'}
                      className="bg-muted cursor-default"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="fechaSiguientePago"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Siguiente Pago</FormLabel>
                  <FormControl>
                    <Input
                      readOnly
                      value={field.value ? format(new Date(field.value), 'PPP', { locale: es }) : 'N/A'}
                      className="bg-muted cursor-default"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
      )}

        <FormField
        control={control}
        name="observacion"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Observación</FormLabel>
            <FormControl>
              <Textarea placeholder="Añadir una observación..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

    </div>
  )
}

export default function UnitForm({ unit, clientId, onSave, onCancel }: UnitFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const isEditing = !!unit;
  const isGlobalAdd = !unit && !clientId;

  const form = useForm<UnitFormInput>({
    resolver: zodResolver(UnitFormSchema),
    defaultValues: unit
      ? { 
          ...unit,
          clientId: unit.clientId,
          costoMensual: unit.costoMensual ?? undefined,
          costoTotalContrato: unit.costoTotalContrato ?? undefined,
          mesesContrato: unit.mesesContrato ?? undefined,
          fechaInicioContrato: new Date(unit.fechaInicioContrato),
          fechaVencimiento: new Date(unit.fechaVencimiento),
          ultimoPago: unit.ultimoPago ? new Date(unit.ultimoPago) : null,
          fechaSiguientePago: new Date(unit.fechaSiguientePago),
        }
      : {
          clientId: clientId ?? '',
          imei: '',
          placa: '',
          modelo: '',
          tipoPlan: 'estandar-sc',
          tipoContrato: 'sin_contrato',
          costoMensual: undefined,
          costoTotalContrato: undefined,
          mesesContrato: undefined,
          fechaInicioContrato: new Date(),
          // These will be calculated on the server on creation
          fechaVencimiento: new Date(), 
          ultimoPago: null,
          fechaSiguientePago: new Date(),
          observacion: '',
        },
  });

  async function onSubmit(values: UnitFormInput) {
    setIsSubmitting(true);
    const finalClientId = isGlobalAdd ? values.clientId : clientId!;
    if (!finalClientId) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un cliente.',
        variant: 'destructive'
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await saveUnit(values, finalClientId, user, unit?.id);
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
        description: 'Ocurrió un error inesperado al guardar la unidad.',
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
          <UnitFormFields showClientSelector={isGlobalAdd} isEditing={isEditing} />
        </ScrollArea>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Guardando...' : 'Guardar Unidad'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
