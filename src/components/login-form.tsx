
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { loginUser, verifyOtpAndLogin } from '@/lib/user-actions';
import { useRouter } from 'next/navigation';

const LoginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es requerido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});
type LoginFormInput = z.infer<typeof LoginSchema>;

const OtpSchema = z.object({
    code: z.string().length(6, 'El código debe tener 6 dígitos.'),
});
type OtpFormInput = z.infer<typeof OtpSchema>;


export default function LoginForm() {
  const { updateUserContext } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [view, setView] = React.useState<'credentials' | 'otp'>('credentials');
  const [otpUserId, setOtpUserId] = React.useState<string | null>(null);

  const credentialsForm = useForm<LoginFormInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const otpForm = useForm<OtpFormInput>({
      resolver: zodResolver(OtpSchema),
      defaultValues: {
          code: '',
      },
  });

  async function onCredentialsSubmit(values: LoginFormInput) {
    setIsSubmitting(true);
    try {
      const result = await loginUser(values);
      if (result.success) {
          if (result.otpRequired && result.userId) {
              setOtpUserId(result.userId);
              setView('otp');
              toast({
                  title: 'Verificación Requerida',
                  description: 'Se ha enviado un código de 6 dígitos a su número de teléfono.',
              });
          } else if (result.user) {
              updateUserContext(result.user);
              router.push('/');
          }
      } else {
        toast({
            title: 'Error de inicio de sesión',
            description: result.message,
            variant: 'destructive',
        });
      }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        toast({
            title: 'Error de inicio de sesión',
            description: errorMessage,
            variant: 'destructive',
        });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onOtpSubmit(values: OtpFormInput) {
      if (!otpUserId) return;
      setIsSubmitting(true);
      try {
          const result = await verifyOtpAndLogin(otpUserId, values.code);
          if (result.success && result.user) {
              updateUserContext(result.user);
              router.push('/');
          } else {
              toast({
                  title: 'Error de Verificación',
                  description: result.message,
                  variant: 'destructive',
              });
          }
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          toast({
              title: 'Error de Verificación',
              description: errorMessage,
              variant: 'destructive',
          });
      } finally {
          setIsSubmitting(false);
      }
  }

  if (view === 'otp') {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Verificación de Dos Pasos</CardTitle>
                <CardDescription>
                Ingrese el código de 6 dígitos enviado a su teléfono.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <FormProvider {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                    <FormField
                    control={otpForm.control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Código de Verificación</FormLabel>
                        <FormControl>
                            <Input placeholder="123456" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" className="w-full" onClick={() => setView('credentials')}>
                            Regresar
                        </Button>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Verificando...' : 'Verificar'}
                        </Button>
                    </div>
                </form>
                </FormProvider>
            </CardContent>
        </Card>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar Sesión</CardTitle>
        <CardDescription>
          Ingrese sus credenciales para acceder al sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...credentialsForm}>
          <form onSubmit={credentialsForm.handleSubmit(onCredentialsSubmit)} className="space-y-6">
            <FormField
              control={credentialsForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de Usuario</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. juanperez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={credentialsForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
