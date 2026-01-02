'use client';

import { useParams } from 'next/navigation';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import UnitFormPage from '../../unit-form-page';

export default function EditUnitPage() {
  const params = useParams();
  const unitId = params.unitId as string;
  const clientId = params.clientId as string;

  return (
    <AppContent>
      <Header title="Editar Unidad" showBackButton backButtonHref={`/clients/${clientId}/units`} />
      <div className="p-4 md:p-6">
        <UnitFormPage clientId={clientId} unitId={unitId} />
      </div>
    </AppContent>
  );
}
