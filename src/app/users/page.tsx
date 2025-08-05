
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getUsers } from '@/lib/user-actions';
import UserList from '@/components/user-list';
import Header from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/user-schema';
import AppContent from '@/components/app-content';
import { useAuth } from '@/context/auth-context';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function UsersPageContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isAuthLoading && user?.role && !['master', 'manager'].includes(user.role)) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  const fetchUsers = React.useCallback(() => {
    if (user && ['master', 'manager'].includes(user.role)) {
        setIsLoading(true);
        getUsers().then(data => {
            setUsers(data);
            setIsLoading(false);
        });
    }
  }, [user]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);


  if (isAuthLoading || isLoading) {
    return (
       <>
         <Header title="Usuarios" />
         <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
         </div>
       </>
    )
  }
  
  if (!user || !['master', 'manager'].includes(user.role)) {
      return (
        <>
            <Header title="Acceso Denegado" />
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No tienes permiso</AlertTitle>
                <AlertDescription>
                    No tienes permiso para acceder a la gestión de usuarios.
                </AlertDescription>
            </Alert>
        </>
      )
  }

  return (
    <>
       <Header title="Usuarios" />
       <UserList initialUsers={users} onDataChange={fetchUsers} />
    </>
  );
}

export default function UsersPage() {
    return (
        <AppContent>
            <UsersPageContent />
        </AppContent>
    )
}
