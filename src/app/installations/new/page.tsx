'use client';

import Header from '@/components/header';
import AppContent from '@/components/app-content';
import InstallationOrderFormPage from '../installation-order-form-page';

export default function NewInstallationOrderPage() {
  return (
    <AppContent>
      <Header title="Nueva Orden de Instalación" showBackButton backButtonHref="/installations" />
      <div className="p-4 md:p-6">
        <InstallationOrderFormPage />
      </div>
    </AppContent>
  );
}
