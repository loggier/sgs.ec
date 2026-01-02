'use client';

import Header from '@/components/header';
import AppContent from '@/components/app-content';
import UnitFormPage from '../unit-form-page';
import { useParams } from 'next/navigation';

export default function NewUnitPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  return (
    <AppContent>
      <Header title="Nueva Unidad" showBackButton backButtonHref={`/clients/${clientId}/units`} />
      <div className="p-4 md:p-6">
        <UnitFormPage clientId={clientId} />
      </div>
    </AppContent>
  );
}
