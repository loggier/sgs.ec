'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import InstallationOrderForm from '@/components/installation-order-form';
import { getInstallationOrderById } from '@/lib/installation-order-actions';
import type { InstallationOrder } from '@/lib/installation-order-schema';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';

type InstallationOrderFormPageProps = {
  orderId?: string;
};

export default function InstallationOrderFormPage({ orderId }: InstallationOrderFormPageProps) {
  const [order, setOrder] = React.useState<InstallationOrder | null>(null);
  const [isLoading, setIsLoading] = React.useState(!!orderId);
  const [error, setError] = React.useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (orderId) {
      getInstallationOrderById(orderId)
        .then((data) => {
          if (data) {
            // Security check: ensure the user can view/edit this order
            const canView =
              user?.role === 'master' ||
              (user?.role === 'manager' && data.ownerId === user.id) ||
              (user?.role === 'tecnico' && data.tecnicoId === user.id);

            if (canView) {
              setOrder(data);
            } else {
              setError('No tiene permiso para ver esta orden.');
            }
          } else {
            setError('La orden de instalación no fue encontrada.');
          }
        })
        .catch(() => setError('Error al cargar los datos de la orden.'))
        .finally(() => setIsLoading(false));
    }
  }, [orderId, user]);
  
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
      <InstallationOrderForm order={order} />
  );
}
