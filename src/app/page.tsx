'use client';

import * as React from 'react';
import { getClients } from '@/lib/actions';
import ClientList from '@/components/client-list';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import type { ClientWithOwner } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { user } = useAuth();
  const [clients, setClients] = React.useState<ClientWithOwner[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      setIsLoading(true);
      getClients(user.id, user.role)
        .then(data => {
          setClients(data);
          setIsLoading(false);
        });
    }
  }, [user]);

  if (isLoading) {
      return (
          <div>
              <Header title="Clientes" />
              <div className="flex flex-col gap-6 mt-4">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-64 w-full" />
              </div>
          </div>
      )
  }

  return (
    <>
      <Header title="Clientes" />
      <ClientList initialClients={clients} />
    </>
  );
}
