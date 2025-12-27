
import AppContent from '@/components/app-content';
import Header from '@/components/header';
import WorkOrderFormPage from '../work-order-form-page';


export default function NewWorkOrderPage() {
    return (
        <AppContent>
            <Header title="Nueva Orden de Trabajo" showBackButton backButtonHref="/work-orders" />
            <div className="mt-6">
              <WorkOrderFormPage />
            </div>
        </AppContent>
    );
}
