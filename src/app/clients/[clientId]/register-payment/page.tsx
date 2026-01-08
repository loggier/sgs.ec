
'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import ClientPaymentForm from '@/components/client-payment-form';
import { getClientById } from '@/lib/actions';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function RegisterPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const clientId = params.clientId as string;
  
  const [clientName, setClientName] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (clientId && user) {
      setIsLoading(true);
      getClientById(clientId, user)
        .then(client => {
          if (client) {
            setClientName(client.nomSujeto);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [clientId, user]);

  const handleSave = () => {
    router.push('/clients');
  };

  const handleCancel = () => {
    router.push('/clients');
  };

  if (isLoading) {
    return (
      <AppContent>
        <Header title="Cargando..." showBackButton backButtonHref="/clients" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppContent>
    );
  }

  if (!clientName) {
      return (
          <AppContent>
              <Header title="Error" showBackButton backButtonHref="/clients" />
              <p className='p-6'>No se pudo encontrar el cliente.</p>
          </AppContent>
      )
  }

  return (
    <AppContent>
      <Header title={`Registrar Pago: ${clientName}`} showBackButton backButtonHref="/clients" />
      <div className="p-4 md:p-6">
        <Card>
            <CardHeader>
                <CardTitle>Nuevo Pago para {clientName}</CardTitle>
                <CardDescription>
                    Seleccione una o más unidades y complete los detalles del pago. El monto total se calculará automáticamente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ClientPaymentForm
                    clientId={clientId}
                    clientName={clientName}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            </CardContent>
        </Card>
      </div>
    </AppContent>
  );
}
