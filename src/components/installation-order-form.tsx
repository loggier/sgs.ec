
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Loader2, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

import { 
    InstallationOrderFormSchema,
    type InstallationOrderFormInput, 
    type InstallationOrder,
    InstallationPlan,
    InstallationCategory,
    InstallationVehicle,
    InstallationSegment,
    InstallationStatus,
    PaymentMethod,
    LugarCorteMotor
} from '@/lib/installation-order-schema';
import { saveInstallationOrder } from '@/lib/installation-order-actions';
import { getClients } from '@/lib/actions';
import { getUsers } from '@/lib/user-actions';
import type { User } from '@/lib/user-schema';
import type { ClientDisplay } from '@/lib/schema';
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
import { Textarea } from './ui/textarea';
import { Combobox } from './ui/combobox';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { ScrollArea } from './ui/scroll-area';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription } from './ui/card';
import { Checkbox } from './ui/checkbox';


type InstallationOrderFormProps = {
  order: InstallationOrder | null;
};

export default function InstallationOrderForm({ order }: InstallationOrderFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [technicians, setTechnicians] = React.useState<User[]>([]);
  const [clients, setClients] = React.useState<ClientDisplay[]>([]);
  const [selectedClientId, setSelectedClientId] = React.useState<string | undefined>(undefined);
  const [isConfirmingComplete, setIsConfirmingComplete] = React.useState(false);
  
  const isEditing = !!order;
  const isTechnician = user?.role === 'tecnico';

  const form = useForm<InstallationOrderFormInput>({
    resolver: zodResolver(InstallationOrderFormSchema), // Use the refined schema
    defaultValues: order ? {
      ...order,
      fechaProgramada: new Date(order.fechaProgramada),
      tecnicoId: order.tecnicoId || undefined,
      observacion: order.observacion || '',
      metodoPago: order.metodoPago || undefined,
      corteDeMotor: order.corteDeMotor || false,
      lugarCorteMotor: order.lugarCorteMotor || undefined,
      instalacionAccesorios: order.instalacionAccesorios || false,
      accesorioBotonPanico: order.accesorioBotonPanico || false,
      accesorioAperturaSeguro: order.accesorioAperturaSeguro || false,
    } : {
        placaVehiculo: '',
        nombreCliente: '',
        ciudad: '',
        ubicacionGoogleMaps: '',
        numeroCliente: '',
        tecnicoId: undefined,
        tipoPlan: 'estandar-cc',
        categoriaInstalacion: 'liviano',
        tipoVehiculo: 'auto',
        segmento: 'personal',
        observacion: '',
        fechaProgramada: new Date(),
        estado: 'pendiente',
        metodoPago: undefined,
        corteDeMotor: false,
        lugarCorteMotor: undefined,
        instalacionAccesorios: false,
        accesorioBotonPanico: false,
        accesorioAperturaSeguro: false,
    },
  });
  
  const estado = form.watch('estado');
  const observacion = form.watch('observacion');
  const corteDeMotor = form.watch('corteDeMotor');
  const instalacionAccesorios = form.watch('instalacionAccesorios');
  
  React.useEffect(() => {
    if (user && !isTechnician) {
        getUsers(user).then(allUsers => {
            const techUsers = allUsers.filter(u => u.role === 'tecnico');
            setTechnicians(techUsers);
        });
        getClients(user.id, user.role, user.creatorId).then(setClients);
    }
  }, [user, isTechnician]);

  React.useEffect(() => {
    if (order) {
        form.reset({
            ...order,
            fechaProgramada: new Date(order.fechaProgramada),
            tecnicoId: order.tecnicoId || undefined,
            observacion: order.observacion || '',
            metodoPago: order.metodoPago || undefined,
            corteDeMotor: order.corteDeMotor || false,
            lugarCorteMotor: order.lugarCorteMotor || undefined,
            instalacionAccesorios: order.instalacionAccesorios || false,
            accesorioBotonPanico: order.accesorioBotonPanico || false,
            accesorioAperturaSeguro: order.accesorioAperturaSeguro || false,
        });
        const client = clients.find(c => c.nomSujeto === order.nombreCliente);
        if (client) {
            setSelectedClientId(client.id);
        }
    } else {
        form.reset({
            placaVehiculo: '',
            nombreCliente: '',
            ciudad: '',
            ubicacionGoogleMaps: '',
            numeroCliente: '',
            tecnicoId: undefined,
            tipoPlan: 'estandar-cc',
            categoriaInstalacion: 'liviano',
            tipoVehiculo: 'auto',
            segmento: 'personal',
            observacion: '',
            fechaProgramada: new Date(),
            estado: 'pendiente',
            metodoPago: undefined,
            corteDeMotor: false,
            lugarCorteMotor: undefined,
            instalacionAccesorios: false,
            accesorioBotonPanico: false,
            accesorioAperturaSeguro: false,
        });
        setSelectedClientId(undefined);
    }
}, [order, clients, form]);


  const handleClientChange = (clientId: string) => {
      setSelectedClientId(clientId);
      const client = clients.find(c => c.id === clientId);
      if (client) {
          form.setValue('nombreCliente', client.nomSujeto);
          form.setValue('numeroCliente', client.telefono || '');
          form.setValue('ciudad', client.ciudad || '');
          form.setValue('segmento', (client.tipoCliente as any) || 'personal');
      }
  };
  
  const technicianOptions = technicians.map(t => ({
      value: t.id,
      label: t.nombre || t.username,
  }));
  
  const clientOptions = clients.map(c => ({
      value: c.id,
      label: c.nomSujeto,
  }));
  
  const onCancel = () => {
    router.push('/installations');
  };

  const proceedToSubmit = async () => {
    await form.handleSubmit(async (values) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const result = await saveInstallationOrder(values, user, order?.id);
            if (result.success) {
                toast({ title: 'Éxito', description: result.message });
                onCancel();
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Ocurrió un error inesperado.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
            setIsConfirmingComplete(false);
        }
    })();
  }
  
  const handleTechnicianSubmit = async () => {
      const currentStatus = form.getValues('estado');
      let nextState: InstallationStatus | undefined = undefined;
      
      if (currentStatus === 'pendiente') {
          nextState = 'en-curso';
      } else if (currentStatus === 'en-curso') {
          nextState = 'terminado';
      }
      
      if (nextState) {
          form.setValue('estado', nextState, { shouldValidate: true, shouldDirty: true });
      }

      // Check for observation only when moving to 'terminado'
      if (form.getValues('estado') === 'terminado' && !form.getValues('observacion')) {
          setIsConfirmingComplete(true);
          return; // Stop execution, wait for dialog confirmation
      }

      // Trigger validation before submitting
      const isValid = await form.trigger();
      if (isValid) {
        await proceedToSubmit();
      }
  };

  const handleConfirmComplete = async () => {
      // The state is already set to 'terminado', now we proceed to submit
      await proceedToSubmit();
  };

  const getTechnicianSubmitButton = () => {
    const currentStatus = form.getValues('estado');
    switch(currentStatus) {
        case 'pendiente':
            return (
                <Button type="button" onClick={handleTechnicianSubmit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Iniciar Trabajo
                </Button>
            );
        case 'en-curso':
            return (
                <Button type="button" onClick={handleTechnicianSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Marcar como Terminado
                </Button>
            );
        case 'terminado':
             return (
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Cambios
                </Button>
            );
        default:
             return null;
    }
  };


  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(proceedToSubmit)} className="flex h-full flex-col">
        <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-6">
                <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    {isTechnician && order ? (
                         <Input value={order.nombreCliente} disabled />
                    ) : (
                        <Combobox
                            options={clientOptions}
                            value={selectedClientId}
                            onChange={handleClientChange}
                            placeholder="Seleccione un cliente..."
                            searchPlaceholder="Buscar cliente..."
                            emptyPlaceholder="No se encontraron clientes."
                            disabled={clients.length === 0 || isEditing}
                        />
                    )}
                     {isEditing && !isTechnician && (
                        <p className="text-sm text-muted-foreground pt-1">El cliente no se puede cambiar al editar una orden.</p>
                     )}
                </FormItem>

                <FormField
                control={form.control}
                name="nombreCliente"
                render={({ field }) => (
                    <FormItem className="hidden">
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                    </FormItem>
                )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="numeroCliente"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Número del Cliente</FormLabel>
                        <FormControl>
                            <Input placeholder="0991234567" {...field} disabled={isTechnician} />
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
                            <Input placeholder="Quito" {...field} disabled={isTechnician} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                
                <FormField
                    control={form.control}
                    name="placaVehiculo"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Placa del Vehículo</FormLabel>
                        <FormControl>
                            <Input placeholder="PCQ-1234" {...field} disabled={isTechnician} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                  control={form.control}
                  name="ubicacionGoogleMaps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación (URL de Google Maps)</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input placeholder="https://maps.app.goo.gl/..." {...field} disabled={isTechnician} />
                        </FormControl>
                        {field.value && (
                          <Button asChild variant="secondary" size="icon" className="shrink-0">
                            <Link href={field.value} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">Ir a mapa</span>
                            </Link>
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="tipoPlan"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tipo de Plan</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isTechnician}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {InstallationPlan.options.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="segmento"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Segmento</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isTechnician}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {InstallationSegment.options.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="categoriaInstalacion"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isTechnician}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {InstallationCategory.options.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="tipoVehiculo"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tipo de Vehículo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isTechnician}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {InstallationVehicle.options.map(v => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {isEditing && (
                    <FormField
                    control={form.control}
                    name="observacion"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Observación del Técnico</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Añada aquí sus notas sobre el trabajo realizado..." rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                )}
                
                {estado === 'terminado' && (
                  <Card className="p-4 border rounded-lg bg-secondary/50">
                    <CardContent className="p-0 space-y-4">
                        <FormField
                            control={form.control}
                            name="metodoPago"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="font-semibold">Confirmación de Pago</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione el método de pago recibido..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {PaymentMethod.options.map(m => (
                                        <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                       <FormField
                          control={form.control}
                          name="corteDeMotor"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                              <div className="space-y-0.5">
                                <FormLabel>¿Se realizó corte de motor?</FormLabel>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        {corteDeMotor && (
                           <FormField
                              control={form.control}
                              name="lugarCorteMotor"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Lugar de Corte de Motor</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                      <SelectTrigger>
                                          <SelectValue placeholder="Seleccione el lugar del corte..." />
                                      </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                      {LugarCorteMotor.options.map(l => (
                                          <SelectItem key={l} value={l}>{l}</SelectItem>
                                      ))}
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                        )}
                        
                        <FormField
                            control={form.control}
                            name="instalacionAccesorios"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                                <div className="space-y-0.5">
                                    <FormLabel>¿Se instalaron accesorios?</FormLabel>
                                </div>
                                <FormControl>
                                    <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />

                        {instalacionAccesorios && (
                            <Card className="p-4 bg-background">
                                <CardDescription className="mb-4">Seleccione los accesorios instalados:</CardDescription>
                                <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="accesorioBotonPanico"
                                    render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Botón de Pánico
                                        </FormLabel>
                                        </div>
                                    </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="accesorioAperturaSeguro"
                                    render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Apertura de Seguro
                                        </FormLabel>
                                        </div>
                                    </FormItem>
                                    )}
                                />
                                </div>
                            </Card>
                        )}


                    </CardContent>
                  </Card>
                )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="tecnicoId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Técnico Asignado</FormLabel>
                            {isTechnician && user ? (
                                <Input value={user.nombre || user.username} disabled />
                            ) : (
                                <Combobox 
                                    options={technicianOptions}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Seleccione un técnico..."
                                    searchPlaceholder='Buscar técnico...'
                                    emptyPlaceholder='No se encontraron técnicos.'
                                    disabled={technicians.length === 0}
                                />
                            )}
                            <FormMessage />
                            </FormItem>
                        )}
                    />
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
                                    className={cn('w-full pl-3 text-left font-normal',!field.value && 'text-muted-foreground')}
                                    disabled={isTechnician}
                                    >
                                    {field.value ? (format(new Date(field.value), 'PPP', { locale: es })) : (<span>Elige una fecha</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
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
                 
                 { !isTechnician && (
                    <FormField
                        control={form.control}
                        name="estado"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                {InstallationStatus.options.map(s => (
                                    <SelectItem key={s} value={s} className="capitalize">{s.replace('-', ' ')}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                 )}
            </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          {isTechnician ? getTechnicianSubmitButton() : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Orden'}
            </Button>
          )}
        </div>
      </form>
      <AlertDialog open={isConfirmingComplete} onOpenChange={setIsConfirmingComplete}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Terminar sin observación?</AlertDialogTitle>
                <AlertDialogDescription>
                    Se recomienda añadir una observación detallando el trabajo realizado antes de terminar la orden. ¿Desea continuar de todas formas?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsConfirmingComplete(false)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmComplete}>
                    Sí, terminar sin observación
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  );
}
