
import AppContent from '@/components/app-content';
import Header from '@/components/header';
import WorkOrderFormPage from '../../work-order-form-page';

export default function EditWorkOrderPage({ params }: { params: { orderId: string } }) {
    const { orderId } = params;
    
    return (
        <AppContent>
            <Header title="Editar Orden de Trabajo" showBackButton backButtonHref="/work-orders" />
            <div className="mt-6">
                <WorkOrderFormPage orderId={orderId} />
            </div>
        </AppContent>
    );
}
