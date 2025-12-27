'use client';

import { useParams } from 'next/navigation';
import Header from '@/components/header';
import AppContent from '@/components/app-content';
import InstallationOrderFormPage from '../../installation-order-form-page';

export default function EditWorkOrderPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  return (
    <AppContent>
      <Header title="Editar Orden de Instalación" showBackButton backButtonHref="/installations" />
      <div className="p-4 md:p-6">
        <InstallationOrderFormPage orderId={orderId} />
      </div>
    </AppContent>
  );
}
