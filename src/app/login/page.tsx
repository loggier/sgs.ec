
'use client';

import * as React from 'react';
import LoginForm from '@/components/login-form';
import Image from 'next/image';
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
                <div className="mb-4">
                    <Image 
                        src="/sgi_logo.png"
                        alt="SGI Logo"
                        width={200}
                        height={200}
                    />
                </div>
                <h1 className="text-3xl font-bold text-center">Bienvenido a SGI</h1>
                <p className="text-muted-foreground text-center">Sistema de Gestión Integrar</p>
            </div>
            <LoginForm />
        </div>
        </div>
    )
}
