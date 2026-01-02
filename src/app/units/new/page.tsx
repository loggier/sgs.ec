'use client';

import Header from '@/components/header';
import AppContent from '@/components/app-content';
import UnitFormPage from '@/app/clients/[clientId]/units/unit-form-page';

export default function NewUnitPage() {
  return (
    <AppContent>
      <Header title="Nueva Unidad Global" showBackButton backButtonHref="/units" />
      <div className="p-4 md:p-6">
        <UnitFormPage clientId="" />
      </div>
    </AppContent>
  );
}
