
'use client';

import * as React from 'react';
import LoginForm from '@/components/login-form';
import { Banknote } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, router]);
    
    if (isLoading || isAuthenticated) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
            <div className="flex flex-col items-center mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary mb-4">
                    <Banknote className="h-8 w-8 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-bold text-center">Bienvenido a SGI</h1>
                <p className="text-muted-foreground text-center">Sistema de Gestión Integrar</p>
            </div>
            <LoginForm />
        </div>
        </div>
    )
}
