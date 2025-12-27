

'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { UserFormSchema, type UserFormInput, type User, UserRole } from '@/lib/user-schema';
import { saveUser } from '@/lib/user-actions';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from './ui/textarea';

type UserFormProps = {
  user: User | null;
  onSave: () => void;
  onCancel: () => void;
};

function UserFormFields({ isEditing }: { isEditing: boolean }) {
  const { control } = useForm<UserFormInput>();
  const { user: currentUser } = useAuth();

  const availableRoles: { value: UserRole, label: string }[] = React.useMemo(() => {
    if (currentUser?.role === 'master') {
        return [
            { value: 'usuario', label: 'Usuario' },
            { value: 'tecnico', label: 'Técnico' },
            { value: 'analista', label: 'Analista' },
            { value: 'manager', label: 'Manager' },
            { value: 'master', label: 'Master' },
        ];
    }
    if (currentUser?.role === 'manager') {
        return [
          { value: 'tecnico', label: 'Técnico' },
          { value: 'analista', label: 'Analista' }
        ];
    }
    return [];
  }, [currentUser]);

  const selectedRole = useWatch({ control, name: 'role' });

  return (
    <div className="space-y-4 py-4">
      <FormField
        control={control}
        name="nombre"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre</FormLabel>
            <FormControl>
              <Input placeholder="ej. Juan Pérez" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de usuario</FormLabel>
              <FormControl>
                <Input placeholder="ej. juanperez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="correo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <Input type="email" placeholder="ej. juan@correo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
          control={control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="ej. 0987654321" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
          <FormField
          control={control}
          name="empresa"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Empresa</FormLabel>
              <FormControl>
                <Input placeholder="ej. Mi Empresa" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        control={control}
        name="nota"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nota Adicional</FormLabel>
            <FormControl>
              <Textarea placeholder="Escriba aquí cualquier nota adicional..." {...field} value={field.value ?? ''}/>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={isEditing ? 'Dejar en blanco para no cambiar' : '******'} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol de Usuario</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={availableRoles.length <= 1 && isEditing}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un rol" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
      </div>
      
      {selectedRole === 'tecnico' && (
        <FormField
          control={control}
          name="ciudad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ciudad (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="ej. Quito" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}

export default function UserForm({ user, onSave, onCancel }: UserFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isEditing = !!user;

  const form = useForm<UserFormInput>({
    resolver: zodResolver(UserFormSchema(isEditing)),
    defaultValues: user
      ? { 
          username: user.username || '',
          correo: user.correo || '',
          nombre: user.nombre || '',
          telefono: user.telefono || '',
          empresa: user.empresa || '',
          nota: user.nota || '',
          ciudad: user.ciudad || '',
          role: user.role,
          password: ''
        }
      : {
          username: '',
          password: '',
          role: 'analista', // Default to a common role
          nombre: '',
          correo: '',
          telefono: '',
          ciudad: '',
          empresa: '',
          nota: '',
        },
  });

  async function onSubmit(values: UserFormInput) {
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      const result = await saveUser(values, currentUser, user?.id);
      if (result.success && result.user) {
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
        description: 'Ocurrió un error inesperado.',
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
          <UserFormFields isEditing={isEditing} />
        </ScrollArea>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? (isEditing ? 'Guardando...' : 'Creando...') : (isEditing ? 'Guardar Cambios' : 'Crear Usuario')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
