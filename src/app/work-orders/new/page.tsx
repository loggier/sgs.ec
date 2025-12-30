'use client';

import Header from '@/components/header';
import AppContent from '@/components/app-content';
import WorkOrderFormPage from '../work-order-form-page';

export default function NewWorkOrderPage() {
  return (
    <AppContent>
      <Header title="Nueva Orden de Soporte" showBackButton backButtonHref="/work-orders" />
      <div className="p-4 md:p-6">
        <WorkOrderFormPage />
      </div>
    </AppContent>
  );
}
