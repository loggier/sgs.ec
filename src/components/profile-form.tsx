
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

import { ProfileFormSchema, type ProfileFormInput, type User } from '@/lib/user-schema';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { Switch } from './ui/switch';

type ProfileFormProps = {
  user: User;
  onSave: (user: User) => void;
  onCancel: () => void;
};

export default function ProfileForm({ user, onSave, onCancel }: ProfileFormProps) {
  const { toast } = useToast();
  const { updateUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      nombre: user.nombre || '',
      telefono: user.telefono || '',
      empresa: user.empresa || '',
      otpEnabled: user.otpEnabled || false,
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: ProfileFormInput) {
    setIsSubmitting(true);
    try {
       if (values.otpEnabled && !user.telefono) {
          toast({
              title: 'Error',
              description: 'Debe registrar un número de teléfono para habilitar la autenticación de dos pasos.',
              variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
      }
      const result = await updateUser(user.id, values);
      if (result.success && result.user) {
        toast({
          title: 'Éxito',
          description: result.message,
        });
        onSave(result.user);
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
        description: 'Ocurrió un error inesperado al actualizar el perfil.',
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
            <FormItem>
              <FormLabel>Nombre de usuario</FormLabel>
              <FormControl>
                <Input value={user.username} disabled />
              </FormControl>
            </FormItem>
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <Input value={user.correo} disabled />
              </FormControl>
            </FormItem>
        </div>
        
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input placeholder="ej. Juan Pérez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input placeholder="ej. 0987654321" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="empresa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <FormControl>
                  <Input placeholder="ej. Mi Empresa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
            control={form.control}
            name="otpEnabled"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Autenticación de dos pasos (OTP)</FormLabel>
                        <FormDescription>
                            Recibirá un código por WhatsApp al iniciar sesión.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!user.telefono}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
        
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Dejar en blanco para no cambiar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Repita la nueva contraseña" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
