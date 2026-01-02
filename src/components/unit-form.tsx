

'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { format, addMonths, isBefore, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, AlertTriangle, Link2, ExternalLink, FileText, Upload, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { UnitFormSchema, type Unit, type UnitFormInput, UnitCategory } from '@/lib/unit-schema';
import { saveUnit, saveContractUrl } from '@/lib/unit-actions';
import { getClients } from '@/lib/actions';
import type { ClientDisplay } from '@/lib/schema';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getPgpsDeviceDetails, type PgpsDevice } from '@/lib/pgps-actions';

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
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { addDays, formatDistanceToNow, parseISO } from 'date-fns';

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

const unitCategoryOptions = UnitCategory.options;


function ContractUploader({ unit }: { unit: Unit }) {
  const { control, setValue } = useFormContext<UnitFormInput>();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = React.useState(false);
  const urlContrato = useWatch({ control, name: 'urlContrato' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        toast({ title: 'Error', description: 'Solo se permiten archivos PDF.', variant: 'destructive' });
        return;
    }
    
    setIsUploading(true);

    try {
        const formData = new FormData();
        formData.append('files', file);

        // Upload directly to the storage service, bypassing our Next.js server
        const response = await fetch('https://storage.gpsplataforma.net/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: 'Error desconocido en el servidor de subida.' }));
            throw new Error(errorBody.error || `Error del servidor: ${response.statusText}`);
        }

        const responseData = await response.json();
        
        if (responseData && responseData.urls && responseData.urls.length > 0) {
            const newUrl = responseData.urls[0];
            setValue('urlContrato', newUrl, { shouldValidate: true });
            toast({ title: 'Éxito', description: 'Contrato subido correctamente.' });

            // If we are editing an existing unit, save the URL immediately via Server Action.
            if (unit && unit.id && unit.clientId) {
                const saveUrlResult = await saveContractUrl(unit.clientId, unit.id, newUrl);
                if (!saveUrlResult.success) {
                    toast({ title: 'Error al Guardar URL', description: saveUrlResult.message, variant: 'destructive'});
                } else {
                    toast({ title: 'URL Guardada', description: 'La URL del contrato se guardó en el registro de la unidad.' });
                }
            }
        } else {
             throw new Error('La respuesta del servicio de subida no contenía una URL.');
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al subir el contrato.';
        toast({ title: 'Error de Subida', description: message, variant: 'destructive' });
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const handleRemoveContract = async () => {
      setValue('urlContrato', '', { shouldValidate: true });
       if (unit && unit.id && unit.clientId) {
          const saveUrlResult = await saveContractUrl(unit.clientId, unit.id, '');
           if (!saveUrlResult.success) {
               toast({ title: 'Error al Quitar URL', description: saveUrlResult.message, variant: 'destructive'});
           } else {
               toast({ title: 'URL Removida', description: 'Se ha quitado la URL del contrato del registro de la unidad.' });
           }
       }
  }

  return (
    <FormItem>
      <FormLabel>Archivo del Contrato</FormLabel>
      <FormControl>
        <div>
            <Input
                id="contract-file-input"
                type="file"
                accept=".pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isUploading}
            />
            {!urlContrato && !isUploading && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Contrato (PDF)
                </Button>
            )}
            
            {isUploading && (
                 <div className="flex items-center gap-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    <span className="text-sm text-muted-foreground">Subiendo...</span>
                 </div>
            )}

            {urlContrato && !isUploading && (
                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted">
                    <FileText className="h-5 w-5 text-primary" />
                    <a href={urlContrato} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate">
                       Ver Contrato
                    </a>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={handleRemoveContract}>
                        <X className="h-4 w-4"/>
                        <span className="sr-only">Quitar contrato</span>
                    </Button>
                </div>
            )}
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}


function PgpsInfoDisplay({ pgpsDeviceId }: { pgpsDeviceId: string }) {
    const [deviceInfo, setDeviceInfo] = React.useState<PgpsDevice | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!pgpsDeviceId) return;
        setIsLoading(true);
        getPgpsDeviceDetails(pgpsDeviceId)
            .then(({ device }) => setDeviceInfo(device))
            .finally(() => setIsLoading(false));
    }, [pgpsDeviceId]);

    const formatTimeAgo = (timestamp?: number | null): string => {
        if (!timestamp) return 'Nunca';
        try {
            const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
            return formatDistanceToNow(date, { addSuffix: true, locale: es });
        } catch (e) {
            return 'Fecha inválida';
        }
    };
    
    const formatExpirationDate = (dateString?: string | null): string => {
        if (!dateString) return 'N/A';
        try {
             // The date string is in 'YYYY-MM-DD HH:mm:ss' format
            const date = parseISO(dateString.replace(' ', 'T'));
            return format(date, 'PPP', { locale: es });
        } catch (e) {
            return 'Fecha inválida';
        }
    }
    
    const getDeviceStatus = (device?: PgpsDevice | null) => {
        if (!device) return { text: 'N/A', color: 'text-gray-400' };
        if (device.active) return { text: 'Activo', color: 'text-green-500' };
        return { text: 'Suspendido', color: 'text-red-500' };
    };
    
    const status = getDeviceStatus(deviceInfo);

    const InfoField = ({ label, value }: { label: string, value: React.ReactNode }) => (
        <div>
            <p className="font-semibold text-sm text-muted-foreground">{label}</p>
            <p className="text-sm">{value || '-'}</p>
        </div>
    );

    return (
        <Card className="bg-secondary/50">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-primary"/>
                    Información de P. GPS (ID: {pgpsDeviceId})
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-5 w-2/3" />
                    </div>
                ) : deviceInfo ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-5">
                       <InfoField label="Estado Dispositivo" value={
                           <span className={cn("font-semibold", status.color)}>
                               {status.text}
                           </span>
                       } />
                       <InfoField label="Última Conexión" value={formatTimeAgo(deviceInfo.moved_timestamp)} />
                       <InfoField label="Tiempo Estacionado" value={deviceInfo.stop_duration} />
                       <InfoField label="Nombre (P. GPS)" value={deviceInfo.name} />
                       <InfoField label="IMEI (P. GPS)" value={deviceInfo.imei} />
                       <InfoField label="Placa (P. GPS)" value={deviceInfo.plate_number} />
                       <InfoField label="Protocolo" value={deviceInfo.protocol} />
                       <InfoField label="Modelo" value={deviceInfo.device_model} />
                       <InfoField label="VIN" value={deviceInfo.vin} />
                       <InfoField label="No. SIM" value={deviceInfo.sim_number} />
                       <InfoField label="Vencimiento (P. GPS)" value={formatExpirationDate(deviceInfo.expiration_date)} />
                       <InfoField label="Propietario (P. GPS)" value={deviceInfo.object_owner} />
                       <div className="col-span-full">
                         <InfoField label="Notas Adicionales (P. GPS)" value={deviceInfo.additional_notes} />
                       </div>
                    </div>
                ) : (
                    <p className="text-muted-foreground">No se pudo cargar la información del dispositivo de P. GPS.</p>
                )}
            </CardContent>
        </Card>
    );
}

function UnitFormFields({ showClientSelector, isEditing, unit, clients }: { showClientSelector: boolean, isEditing: boolean, unit: Unit | null, clients: ClientDisplay[] }) {
  const { control, setValue, getValues, watch } = useFormContext<UnitFormInput>();
  
  const tipoContrato = watch('tipoContrato');
  const fechaInicioContrato = watch('fechaInicioContrato');
  const mesesContrato = watch('mesesContrato');
  const fechaSiguientePago = watch('fechaSiguientePago');
  const diasCorte = watch('diasCorte');

  const [showWarning, setShowWarning] = React.useState(false);
  const initialStartDate = React.useRef(getValues('fechaInicioContrato'));

  const clientOptions = clients.map(c => ({
    value: c.id!,
    label: `${c.nomSujeto} (${c.codIdSujeto})`,
  }));

  const diasCorteOptions = [
    { value: 0, label: 'Mismo día de vencimiento' },
    ...Array.from({ length: 6 }, (_, i) => ({ value: i + 2, label: `${i + 2} días después del vencimiento` })),
  ];
  
  const calculateNextCutoffDate = () => {
    if (fechaSiguientePago instanceof Date && typeof diasCorte === 'number' && diasCorte >= 0) {
      return addDays(fechaSiguientePago, diasCorte);
    }
    return null;
  };
  const proximaFechaCorte = calculateNextCutoffDate();

  React.useEffect(() => {
    if (isEditing) return; 

    if (tipoContrato === 'sin_contrato') {
      setValue('costoTotalContrato', undefined);
      setValue('mesesContrato', undefined);
    } else if (tipoContrato === 'con_contrato') {
      setValue('costoMensual', undefined);
    }
  }, [tipoContrato, setValue, isEditing]);
  
  React.useEffect(() => {
    if (!fechaInicioContrato || !(fechaInicioContrato instanceof Date)) return;

    const newStartDate = new Date(fechaInicioContrato);
    let newVencimiento;
    if (tipoContrato === 'con_contrato' && mesesContrato && mesesContrato > 0) {
      newVencimiento = addMonths(newStartDate, mesesContrato);
    } else {
      newVencimiento = addMonths(newStartDate, 1);
    }
    setValue('fechaVencimiento', newVencimiento);

    if (isEditing) {
      const originalStartDateValue = initialStartDate.current;
      const originalStartDate = originalStartDateValue instanceof Date ? originalStartDateValue : null;

      if (!originalStartDate || newStartDate.getTime() !== originalStartDate.getTime()) {
        setShowWarning(true);
        // On start date change, always reset the payment cycle relative to the new start date.
        const nextPayment = addMonths(newStartDate, 1);
        setValue('fechaSiguientePago', nextPayment);
      } else {
        setShowWarning(false);
      }
    } else {
      // For new units, always set the next payment date based on the start date.
      setValue('fechaSiguientePago', addMonths(newStartDate, 1));
    }
  }, [fechaInicioContrato, mesesContrato, tipoContrato, isEditing, setValue]);
  
  const formatDateSafe = (date: Date | null | undefined): string => {
      if (!date || !(date instanceof Date)) return 'N/A';
      return format(date, 'PPP', { locale: es });
  }

  return (
    <div className="space-y-4 py-4">
      {unit?.pgpsDeviceId && <PgpsInfoDisplay pgpsDeviceId={unit.pgpsDeviceId} />}

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

       <FormField
          control={control}
          name="categoriaVehiculo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría de Vehículo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {unitCategoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <FormLabel>Plan</FormLabel>
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
              <FormLabel>Tipo de Plan</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un tipo de plan" />
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
        <div className="space-y-4">
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
          <FormField
            control={control}
            name="numeroOperacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Operación</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. 123-456-789" {...field} value={field.value ?? ''}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {unit && unit.id && (
             <FormField
                control={control}
                name="urlContrato"
                render={({ field }) => <ContractUploader unit={unit} />}
             />
          )}
          {!unit && (
              <FormItem>
                <FormLabel>Archivo del Contrato</FormLabel>
                <p className="text-sm text-muted-foreground pt-2">
                    Guarde la unidad primero para poder subir un contrato.
                </p>
              </FormItem>
          )}
        </div>
      )}

      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="fechaInstalacion"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha de Instalación</FormLabel>
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
                      {field.value instanceof Date ? (
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
                    selected={field.value instanceof Date ? field.value : undefined}
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
          control={control}
          name="fechaInicioContrato"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha Inicio</FormLabel>
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
                      {field.value instanceof Date ? (
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
                    selected={field.value instanceof Date ? field.value : undefined}
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

       <FormField
          control={control}
          name="fechaVencimiento"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha de Vencimiento</FormLabel>
              <FormControl>
                <Input
                  readOnly
                  value={field.value instanceof Date ? format(field.value, 'PPP', { locale: es }) : 'Calculando...'}
                  className="bg-muted cursor-default"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      
      {showWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Al cambiar la fecha de inicio, el ciclo de pagos se reiniciará. El último pago se anulará y la fecha de siguiente pago se recalculará.
          </AlertDescription>
        </Alert>
      )}

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
                      value={formatDateSafe(field.value)}
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
                      value={formatDateSafe(field.value)}
                      className="bg-muted cursor-default"
                    />
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
          name="diasCorte"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Días para el corte</FormLabel>
              <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value ?? 0)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione los días para el corte" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {diasCorteOptions.map(option => (
                      <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
            <FormLabel>Próxima Fecha de Corte (Suspensión)</FormLabel>
            <FormControl>
                 <Input
                    readOnly
                    value={proximaFechaCorte ? format(proximaFechaCorte, 'PPP', { locale: es }) : 'Calculando...'}
                    className="bg-muted cursor-default"
                />
            </FormControl>
        </FormItem>
      </div>

        <FormField
        control={control}
        name="observacion"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Observación</FormLabel>
            <FormControl>
              <Textarea placeholder="Añadir una observación..." {...field} value={field.value ?? ''}/>
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
  const [clients, setClients] = React.useState<ClientDisplay[]>([]);
  
  const isEditing = !!unit;
  const isGlobalAdd = !unit && !clientId;

  const form = useForm<UnitFormInput>({
    resolver: zodResolver(UnitFormSchema),
    defaultValues: unit
      ? { 
          ...unit,
          clientId: unit.clientId,
          categoriaVehiculo: unit.categoriaVehiculo ?? undefined,
          costoMensual: unit.costoMensual ?? undefined,
          costoTotalContrato: unit.costoTotalContrato ?? undefined,
          mesesContrato: unit.mesesContrato ?? undefined,
          numeroOperacion: unit.numeroOperacion ?? undefined,
          fechaInstalacion: unit.fechaInstalacion ? new Date(unit.fechaInstalacion) : null,
          fechaInicioContrato: unit.fechaInicioContrato ? new Date(unit.fechaInicioContrato) : new Date(),
          fechaVencimiento: unit.fechaVencimiento ? new Date(unit.fechaVencimiento) : new Date(),
          ultimoPago: unit.ultimoPago ? new Date(unit.ultimoPago) : null,
          fechaSiguientePago: unit.fechaSiguientePago ? new Date(unit.fechaSiguientePago) : new Date(),
          diasCorte: unit.diasCorte ?? 0,
          observacion: unit.observacion ?? '',
          urlContrato: unit.urlContrato ?? '',
        }
      : {
          clientId: clientId ?? '',
          imei: '',
          placa: '',
          modelo: '',
          categoriaVehiculo: 'Vehículo liviano',
          tipoPlan: 'estandar-sc',
          tipoContrato: 'sin_contrato',
          costoMensual: undefined,
          costoTotalContrato: undefined,
          mesesContrato: undefined,
          numeroOperacion: undefined,
          fechaInstalacion: new Date(),
          fechaInicioContrato: new Date(),
          fechaVencimiento: addMonths(new Date(), 1), 
          ultimoPago: null,
          fechaSiguientePago: addMonths(new Date(), 1),
          diasCorte: 0,
          observacion: '',
          urlContrato: '',
        },
  });

  React.useEffect(() => {
    if (isGlobalAdd && user && ['master', 'manager', 'analista'].includes(user.role)) {
      getClients(user.id, user.role, user.creatorId).then(setClients);
    }
  }, [isGlobalAdd, user]);

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
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado al guardar la unidad.';
      toast({
        title: 'Error',
        description: errorMessage,
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
          <UnitFormFields showClientSelector={isGlobalAdd} isEditing={isEditing} unit={unit} clients={clients} />
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

    
