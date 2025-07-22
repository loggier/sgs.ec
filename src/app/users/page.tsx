
'use client';

import * as React from 'react';
import { getUsers } from '@/lib/user-actions';
import UserList from '@/components/user-list';
import Header from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/user-schema';
import AppContent from '@/components/app-content';

function UsersPageContent() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    getUsers().then(data => {
      setUsers(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
       <>
         <Header title="Usuarios" />
         <Skeleton className="h-96 w-full" />
       </>
    )
  }

  return (
    <>
       <Header title="Usuarios" />
       <UserList initialUsers={users} />
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
