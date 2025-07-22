
'use client';

import * as React from 'react';
import { getUsers } from '@/lib/user-actions';
import UserList from '@/components/user-list';
import Header from '@/components/header';
import MainContent from '@/components/main-content';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/user-schema';

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
       <div className="flex flex-col h-full">
         <Header title="Usuarios" />
         <Skeleton className="h-96 w-full" />
       </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
       <Header title="Usuarios" />
       <UserList initialUsers={users} />
    </div>
  );
}


export default function UsersPage() {
  return (
    <MainContent>
      <UsersPageContent />
    </MainContent>
  )
}
