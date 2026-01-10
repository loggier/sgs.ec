
'use client';

import * as React from 'react';
import Modal from 'react-modal';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Loader2, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { WorkOrderFormSchema, type WorkOrderFormInput, type WorkOrder, WorkOrderPriority, WorkOrderStatus } from '@/lib/work-order-schema';
import { saveWorkOrder } from '@/lib/work-order-actions';
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
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';

if (typeof window !== 'undefined') {
  Modal.setAppElement('body');
}

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
  const [clients, setClients] = React.useState<ClientDisplay[]>([]);
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [cities, setCities] = React.useState<City[]>([]);
  const [selectedClientId, setSelectedClientId] = React.useState<string | undefined>(undefined);
  const [isConfirmingComplete, setIsConfirmingComplete] = React.useState(false);
  
  const isEditing = !!order;
  const isTechnician = user?.role === 'tecnico';
  
  const form = useForm<WorkOrderFormInput>({
    resolver: zodResolver(WorkOrderFormSchema),
    defaultValues: order ? {
      ...order,
      fechaProgramada: new Date(order.fechaProgramada),
      horaProgramada: order.horaProgramada || '09:00',
      tecnicoId: order.tecnicoId || undefined,
      observacion: order.observacion || '',
      pais: order.pais || 'Ecuador',
    } : {
        placaVehiculo: '',
        nombreCliente: '',
        pais: 'Ecuador',
        ciudad: '',
        ubicacionGoogleMaps: '',
        numeroCliente: '',
        tecnicoId: undefined,
        prioridad: 'media',
        descripcion: '',
        observacion: '',
        fechaProgramada: new Date(),
        horaProgramada: '09:00',
        estado: 'pendiente',
    },
  });
  
  const estado = form.watch('estado');
  const observacion = form.watch('observacion');
  const isCompleted = estado === 'completada';
  const selectedCountryName = form.watch('pais');

  const selectedCountry = countries.find(c => c.name === selectedCountryName);
  const filteredCities = cities.filter(city => city.countryId === selectedCountry?.id);
  
  React.useEffect(() => {
    async function fetchData() {
        if (user && !isTechnician) {
            const [techUsers, clientData, countryData, cityData] = await Promise.all([
                getUsers(user),
                getClients(user.id, user.role, user.creatorId),
                getCountries(),
                getCities()
            ]);
            setTechnicians(techUsers.filter(u => u.role === 'tecnico'));
            setClients(clientData);
            setCountries(countryData);
            setCities(cityData);
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
            pais: order.pais || 'Ecuador',
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
            prioridad: 'media',
            descripcion: '',
            observacion: '',
            fechaProgramada: new Date(),
            horaProgramada: '09:00',
            estado: 'pendiente',
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
           // País se mantiene por defecto a Ecuador
          form.setValue('pais', 'Ecuador');
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
  
  const proceedToSubmit = async () => {
    await form.handleSubmit(async (values) => {
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
            setIsConfirmingComplete(false);
        }
    })();
  }
  
  const handleTechnicianSubmit = async () => {
      const isValid = await form.trigger();
      if (!isValid) return;

      if (estado === 'pendiente') {
          form.setValue('estado', 'en-progreso', { shouldValidate: true });
          await proceedToSubmit();
      } else if (estado === 'en-progreso') {
          if (!observacion) {
              setIsConfirmingComplete(true);
          } else {
              form.setValue('estado', 'completada', { shouldValidate: true });
              await proceedToSubmit();
          }
      } else { // estado es 'completada'
          await proceedToSubmit();
      }
  };

  const handleConfirmComplete = async () => {
      form.setValue('estado', 'completada', { shouldValidate: true });
      await proceedToSubmit();
  };

  const getTechnicianSubmitButton = () => {
    switch(estado) {
        case 'pendiente':
            return (
                <Button type="button" onClick={handleTechnicianSubmit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Iniciar Trabajo y Guardar
                </Button>
            );
        case 'en-progreso':
            return (
                <Button type="button" onClick={handleTechnicianSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Completar Orden y Guardar
                </Button>
            );
        case 'completada':
             return (
                <Button type="button" onClick={handleTechnicianSubmit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Observación
                </Button>
            );
        default:
             return (
                <Button type="button" onClick={handleTechnicianSubmit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Cambios
                </Button>
            );
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
                
                <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Descripción de la Tarea</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Describa el trabajo a realizar..." rows={4} {...field} disabled={isTechnician || isCompleted} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                {(isTechnician || isEditing) && (
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
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="prioridad"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Prioridad</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isTechnician || isCompleted}>
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
                                    className={cn(
                                        'w-full pl-3 text-left font-normal',
                                        !field.value && 'text-muted-foreground'
                                    )}
                                    disabled={isTechnician || isCompleted}
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
                                <FormLabel>Hora Programada</FormLabel>
                                <FormControl>
                                    <Input type="time" {...field} value={field.value || ''} disabled={isTechnician || isCompleted} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                     />
                </div>

                <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isTechnician || isCompleted}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione un estado" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {WorkOrderStatus.options.map(s => (
                                <SelectItem key={s} value={s} className="capitalize">{s.replace('-', ' ')}</SelectItem>
                            ))}
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
            <DialogHeader>
                <DialogTitle>¿Completar sin observación?</DialogTitle>
                <DialogDescription>
                    Se recomienda añadir una observación detallando el trabajo realizado antes de completar la orden. ¿Desea completarla de todas formas?
                </DialogDescription>
            </DialogHeader>
            <AlertDialogFooter className="mt-4">
                <AlertDialogCancel onClick={() => setIsConfirmingComplete(false)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmComplete}>
                    Sí, completar sin observación
                </AlertDialogAction>
            </AlertDialogFooter>
        </div>
      </Modal>
    </FormProvider>
  );
}
