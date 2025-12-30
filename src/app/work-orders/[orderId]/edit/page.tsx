'use client';

import { useParams } from 'next/navigation';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import WorkOrderFormPage from '../../work-order-form-page';

export default function EditWorkOrderPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  return (
    <AppContent>
      <Header title="Editar Orden de Soporte" showBackButton backButtonHref="/work-orders" />
      <div className="p-4 md:p-6">
        <WorkOrderFormPage orderId={orderId} />
      </div>
    </AppContent>
  );
}
