
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
import { Form, FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { useToast } from '@/hooks/use-toast';
import { getCountries, saveCountry, deleteCountry } from '@/lib/catalog-actions';
import { CountrySchema, type Country, type CountryFormInput } from '@/lib/catalog-schema';

function CountryForm({ country, onSave, onCancel }: { country: Country | null, onSave: () => void, onCancel: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<CountryFormInput>({
        resolver: zodResolver(CountrySchema.omit({ id: true })),
        defaultValues: country ? { name: country.name, code: country.code } : { name: '', code: '' },
    });

    const onSubmit = async (data: CountryFormInput) => {
        setIsSubmitting(true);
        const result = await saveCountry(data, user, country?.id);
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
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del País</FormLabel>
                            <FormControl><Input placeholder="Ecuador" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Código (2-3 letras)</FormLabel>
                            <FormControl><Input placeholder="EC" {...field} /></FormControl>
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

function CountriesPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [countries, setCountries] = React.useState<Country[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedCountry, setSelectedCountry] = React.useState<Country | null>(null);

  const fetchCountries = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCountries();
      setCountries(data);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los países.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (!authLoading) {
      if (user?.role !== 'master') {
        router.push('/settings');
      } else {
        fetchCountries();
      }
    }
  }, [user, authLoading, router, fetchCountries]);
  
  const handleAdd = () => {
    setSelectedCountry(null);
    setIsFormOpen(true);
  };

  const handleEdit = (country: Country) => {
    setSelectedCountry(country);
    setIsFormOpen(true);
  };
  
  const handleDelete = (country: Country) => {
    setSelectedCountry(country);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCountry) return;
    const result = await deleteCountry(selectedCountry.id!, user);
    if (result.success) {
        toast({ title: 'Éxito', description: result.message });
        fetchCountries();
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
      <Header title="Gestión de Países" showBackButton backButtonHref="/settings" />
       <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Catálogo de Países</CardTitle>
                  <CardDescription>Añada, edite o elimine los países disponibles en el sistema.</CardDescription>
                </div>
                <Button onClick={handleAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo País
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries.length > 0 ? (
                    countries.map(country => (
                      <TableRow key={country.id}>
                        <TableCell className="font-medium">{country.name}</TableCell>
                        <TableCell>{country.code}</TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(country)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(country)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={3} className="text-center h-24">No hay países creados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCountry ? 'Editar País' : 'Nuevo País'}</DialogTitle>
            <DialogDescription>Complete los detalles del país.</DialogDescription>
          </DialogHeader>
          <CountryForm country={selectedCountry} onSave={() => { setIsFormOpen(false); fetchCountries(); }} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará el país <span className="font-semibold">{selectedCountry?.name}</span> y todas sus ciudades asociadas. Esta acción no se puede deshacer.</AlertDialogDescription>
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

export default function CountriesPage() {
    return <AppContent><CountriesPageContent /></AppContent>;
}
