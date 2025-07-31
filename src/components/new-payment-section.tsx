
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import type { ClientDisplay } from '@/lib/schema';
import { getClients } from '@/lib/actions';
import { Combobox } from './ui/combobox';
import ClientPaymentForm from './client-payment-form';

type NewPaymentSectionProps = {
  onPaymentSaved: () => void;
};

export default function NewPaymentSection({ onPaymentSaved }: NewPaymentSectionProps) {
  const { user } = useAuth();
  const [clients, setClients] = React.useState<ClientDisplay[]>([]);
  const [selectedClientId, setSelectedClientId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (user) {
      getClients(user.id, user.role).then(setClients);
    }
  }, [user]);

  const clientOptions = clients.map(c => ({
    value: c.id!,
    label: `${c.nomSujeto} (${c.codIdSujeto})`,
  }));

  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;

  const handleSave = () => {
      setSelectedClientId(undefined); // Reset the form
      onPaymentSaved();
  }

  const handleCancel = () => {
      setSelectedClientId(undefined);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Nuevo Pago</CardTitle>
        <CardDescription>
          Seleccione un cliente para ver sus unidades y registrar un pago por lote.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-md">
            <Combobox
                options={clientOptions}
                value={selectedClientId}
                onChange={setSelectedClientId}
                placeholder="Seleccione un cliente..."
                searchPlaceholder="Buscar cliente por nombre o ID..."
                disabled={clients.length === 0}
            />
        </div>
        
        {selectedClient && (
            <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Pago para {selectedClient.nomSujeto}</h3>
                <ClientPaymentForm
                    clientId={selectedClient.id}
                    clientName={selectedClient.nomSujeto}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            </div>
        )}

      </CardContent>
    </Card>
  );
}
