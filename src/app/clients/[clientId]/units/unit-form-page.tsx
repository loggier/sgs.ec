'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

import UnitForm from '@/components/unit-form';
import { getUnitById } from '@/lib/unit-actions';
import type { Unit } from '@/lib/unit-schema';

type UnitFormPageProps = {
  clientId: string;
  unitId?: string;
};

export default function UnitFormPage({ clientId, unitId }: UnitFormPageProps) {
  const [unit, setUnit] = React.useState<Unit | null>(null);
  const [isLoading, setIsLoading] = React.useState(!!unitId);
  const [error, setError] = React.useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (unitId) {
      getUnitById(clientId, unitId)
        .then((data) => {
          if (data) {
            setUnit(data);
          } else {
            setError('La unidad no fue encontrada.');
          }
        })
        .catch(() => setError('Error al cargar los datos de la unidad.'))
        .finally(() => setIsLoading(false));
    }
  }, [clientId, unitId]);

  const handleSave = () => {
    router.push(`/clients/${clientId}/units`);
  };

  const handleCancel = () => {
    router.back();
  };

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
    <UnitForm 
      unit={unit} 
      clientId={clientId} 
      onSave={handleSave} 
      onCancel={handleCancel} 
    />
  );
}
