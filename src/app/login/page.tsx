
import LoginForm from '@/components/login-form';
import { Banknote } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary mb-4">
                <Banknote className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-center">Bienvenido a SGC</h1>
            <p className="text-muted-foreground text-center">Sistema de Gestión de Clientes</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
