
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, MoreVertical } from 'lucide-react';
import AppContent from '@/components/app-content';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useToast } from '@/hooks/use-toast';
import { getCities, saveCity, deleteCity, getCountries } from '@/lib/catalog-actions';
import { CitySchema, type City, type CityFormInput, type Country } from '@/lib/catalog-schema';

function CityForm({ city, countries, onSave, onCancel }: { city: City | null, countries: Country[], onSave: () => void, onCancel: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<CityFormInput>({
        resolver: zodResolver(CitySchema.omit({ id: true, countryName: true })),
        defaultValues: city ? { name: city.name, countryId: city.countryId } : { name: '', countryId: '' },
    });

    const onSubmit = async (data: CityFormInput) => {
        setIsSubmitting(true);
        const result = await saveCity(data, user, city?.id);
        if (result.success) {
            toast({ title: 'Éxito', description: result.message });
            onSave();
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="countryId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>País</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Seleccione un país" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {countries.map(country => (
                                        <SelectItem key={country.id} value={country.id!}>{country.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre de la Ciudad</FormLabel>
                            <FormControl><Input placeholder="Quito" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}

function CitiesPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [cities, setCities] = React.useState<City[]>([]);
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedCity, setSelectedCity] = React.useState<City | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [citiesData, countriesData] = await Promise.all([getCities(), getCountries()]);
      setCities(citiesData);
      setCountries(countriesData);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (!authLoading) {
      if (user?.role !== 'master') {
        router.push('/settings');
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, router, fetchData]);
  
  const handleAdd = () => {
    setSelectedCity(null);
    setIsFormOpen(true);
  };

  const handleEdit = (city: City) => {
    setSelectedCity(city);
    setIsFormOpen(true);
  };
  
  const handleDelete = (city: City) => {
    setSelectedCity(city);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCity) return;
    const result = await deleteCity(selectedCity.id!, user);
    if (result.success) {
        toast({ title: 'Éxito', description: result.message });
        fetchData();
    } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setIsDeleteDialogOpen(false);
  };
  
  if (authLoading || isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (user?.role !== 'master') {
    return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>Solo los usuarios con rol "Master" pueden gestionar los catálogos.</AlertDescription>
        </Alert>
    );
  }

  return (
    <>
      <Header title="Gestión de Ciudades" showBackButton backButtonHref="/settings" />
       <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Catálogo de Ciudades</CardTitle>
                  <CardDescription>Añada, edite o elimine las ciudades disponibles en el sistema.</CardDescription>
                </div>
                <Button onClick={handleAdd} disabled={countries.length === 0}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva Ciudad
                </Button>
            </div>
            {countries.length === 0 && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4"/><AlertTitle>Acción Requerida</AlertTitle><AlertDescription>Debe crear al menos un país antes de poder añadir ciudades.</AlertDescription></Alert>}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cities.length > 0 ? (
                    cities.map(city => (
                      <TableRow key={city.id}>
                        <TableCell className="font-medium">{city.name}</TableCell>
                        <TableCell>{city.countryName}</TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(city)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(city)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={3} className="text-center h-24">No hay ciudades creadas.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCity ? 'Editar Ciudad' : 'Nueva Ciudad'}</DialogTitle>
            <DialogDescription>Complete los detalles de la ciudad.</DialogDescription>
          </DialogHeader>
          <CityForm city={selectedCity} countries={countries} onSave={() => { setIsFormOpen(false); fetchData(); }} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará la ciudad <span className="font-semibold">{selectedCity?.name}</span>. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function CitiesPage() {
    return <AppContent><CitiesPageContent /></AppContent>;
}
