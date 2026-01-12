
'use client';

import * as React from 'react';
import Modal from 'react-modal';
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
import { getCountries, getCities } from '@/lib/catalog-actions';
import type { User } from '@/lib/user-schema';
import type { ClientDisplay } from '@/lib/schema';
import type { Country, City } from '@/lib/catalog-schema';
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
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription } from './ui/card';

if (typeof window !== 'undefined') {
  Modal.setAppElement('body');
}

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
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [cities, setCities] = React.useState<City[]>([]);
  const [selectedClientId, setSelectedClientId] = React.useState<string | undefined>(undefined);
  const [isConfirmingComplete, setIsConfirmingComplete] = React.useState(false);
  
  const isEditing = !!order;
  const isTechnician = user?.role === 'tecnico';

  const form = useForm<InstallationOrderFormInput>({
    resolver: zodResolver(InstallationOrderFormSchema), // Use the refined schema
    defaultValues: order ? {
      ...order,
      fechaProgramada: new Date(order.fechaProgramada),
      horaProgramada: order.horaProgramada || '09:00',
      tecnicoId: order.tecnicoId || undefined,
      observacion: order.observacion || '',
      metodoPago: order.metodoPago || undefined,
      corteDeMotor: order.corteDeMotor || false,
      lugarCorteMotor: order.lugarCorteMotor || undefined,
      instalacionAccesorios: order.instalacionAccesorios || false,
      accesorioBotonPanico: order.accesorioBotonPanico || false,
      accesorioAperturaSeguro: order.accesorioAperturaSeguro || false,
      pais: order.pais || 'Ecuador',
      ciudad: order.ciudad || '',
    } : {
        placaVehiculo: '',
        nombreCliente: '',
        pais: 'Ecuador',
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
        horaProgramada: '09:00',
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
  const selectedCountryName = form.watch('pais');
  const isCompleted = estado === 'terminado';

  const selectedCountry = countries.find(c => c.name === selectedCountryName);
  const filteredCities = cities.filter(city => city.countryId === selectedCountry?.id);
  
  React.useEffect(() => {
    async function fetchData() {
        if (user) {
             const [countryData, cityData] = await Promise.all([
                getCountries(),
                getCities()
            ]);
            setCountries(countryData);
            setCities(cityData);
            
            if (!isTechnician) {
                const [techUsers, clientData] = await Promise.all([
                    getUsers(user),
                    getClients(user.id, user.role, user.creatorId),
                ]);
                setTechnicians(techUsers.filter(u => u.role === 'tecnico'));
                setClients(clientData);
            }
        }
    }
    fetchData();
  }, [user, isTechnician]);

  React.useEffect(() => {
    if (order) {
        form.reset({
            ...order,
            fechaProgramada: new Date(order.fechaProgramada),
            horaProgramada: order.horaProgramada || '09:00',
            tecnicoId: order.tecnicoId || undefined,
            observacion: order.observacion || '',
            metodoPago: order.metodoPago || undefined,
            corteDeMotor: order.corteDeMotor || false,
            lugarCorteMotor: order.lugarCorteMotor || undefined,
            instalacionAccesorios: order.instalacionAccesorios || false,
            accesorioBotonPanico: order.accesorioBotonPanico || false,
            accesorioAperturaSeguro: order.accesorioAperturaSeguro || false,
            pais: order.pais || 'Ecuador',
            ciudad: order.ciudad || '',
        });
        const client = clients.find(c => c.nomSujeto === order.nombreCliente);
        if (client) {
            setSelectedClientId(client.id);
        }
    } else {
        form.reset({
            placaVehiculo: '',
            nombreCliente: '',
            pais: 'Ecuador',
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
            horaProgramada: '09:00',
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
          // País se mantiene por defecto a Ecuador, pero se podría ajustar si el cliente tiene país
          form.setValue('pais', 'Ecuador');
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
                <Button type="submit" disabled={isSubmitting || isCompleted}>
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
                            disabled={clients.length === 0 || isEditing || isCompleted}
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
                
                <FormField
                    control={form.control}
                    name="numeroCliente"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Número del Cliente</FormLabel>
                        <FormControl>
                            <Input placeholder="0991234567" {...field} disabled={isTechnician || isCompleted} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="pais"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>País</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isTechnician || isCompleted}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {countries.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
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
                                <Select onValueChange={field.onChange} value={field.value} disabled={isTechnician || isCompleted || !selectedCountryName}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione una ciudad"/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {filteredCities.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {!selectedCountryName && <p className="text-sm text-muted-foreground pt-1">Seleccione un país primero.</p>}
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
                            <Input placeholder="PCQ-1234" {...field} disabled={isTechnician || isCompleted} />
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
                          <Input placeholder="https://maps.app.goo.gl/..." {...field} disabled={isTechnician || isCompleted} />
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
                            <Select onValueChange={field.onChange} value={field.value} disabled={isTechnician || isCompleted}>
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
                            <Select onValueChange={field.onChange} value={field.value} disabled={isTechnician || isCompleted}>
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
                            <Select onValueChange={field.onChange} value={field.value} disabled={isTechnician || isCompleted}>
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
                            <Select onValueChange={field.onChange} value={field.value} disabled={isTechnician || isCompleted}>
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

                <FormField
                control={form.control}
                name="observacion"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Observación del Técnico</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Añada aquí sus notas sobre el trabajo realizado..." rows={4} {...field} disabled={isCompleted} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                {(estado === 'en-curso' || estado === 'terminado') && (
                  <Card className="p-4 border rounded-lg bg-secondary/50">
                    <CardContent className="p-0 space-y-4">
                        <FormField
                            control={form.control}
                            name="metodoPago"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="font-semibold">Confirmación de Pago</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isCompleted}>
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
                                  disabled={isCompleted}
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
                                  <Select onValueChange={field.onChange} value={field.value} disabled={isCompleted}>
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
                                    disabled={isCompleted}
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
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel>Botón de Pánico</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={isCompleted}
                                                />
                                            </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="accesorioAperturaSeguro"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel>Apertura de Seguro</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={isCompleted}
                                                />
                                            </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </Card>
                        )}


                    </CardContent>
                  </Card>
                )}

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
                                disabled={technicians.length === 0 || isCompleted}
                            />
                        )}
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 
                 <div className="grid grid-cols-2 gap-4">
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
                                    disabled={isTechnician || isCompleted}
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
                    <FormField
                        control={form.control}
                        name="horaProgramada"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Hora</FormLabel>
                                <FormControl>
                                    <Input type="time" {...field} value={field.value || ''} disabled={isTechnician || isCompleted} />
                                </FormControl>
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
                            <Select onValueChange={field.onChange} value={field.value} disabled={isCompleted}>
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
            {isCompleted ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!isCompleted && (
            isTechnician ? getTechnicianSubmitButton() : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Guardando...' : 'Guardar Orden'}
              </Button>
            )
          )}
        </div>
      </form>
      <Modal
        isOpen={isConfirmingComplete}
        onRequestClose={() => setIsConfirmingComplete(false)}
        className="fixed inset-0 flex items-center justify-center p-4"
        overlayClassName="fixed inset-0 bg-black/50"
        contentLabel="Confirmar Completar Orden"
      >
        <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-lg">
            <div className="text-center sm:text-left">
                <h2 className="text-lg font-semibold leading-none tracking-tight">¿Terminar sin observación?</h2>
                <p className="text-sm text-muted-foreground mt-2">
                    Se recomienda añadir una observación detallando el trabajo realizado antes de terminar la orden. ¿Desea continuar de todas formas?
                </p>
            </div>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                <Button variant="outline" onClick={() => setIsConfirmingComplete(false)}>Cancelar</Button>
                <Button onClick={handleConfirmComplete}>
                    Sí, terminar sin observación
                </Button>
            </div>
        </div>
      </Modal>
    </FormProvider>
  );
}
