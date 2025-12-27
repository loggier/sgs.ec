
'use client';

import * as React from 'react';
import { getWorkOrderById } from '@/lib/work-order-actions';
import type { WorkOrder } from '@/lib/work-order-schema';
import WorkOrderForm from '@/components/work-order-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

type WorkOrderFormPageProps = {
    orderId?: string;
};

export default function WorkOrderFormPage({ orderId }: WorkOrderFormPageProps) {
    const [order, setOrder] = React.useState<WorkOrder | null>(null);
    const [isLoading, setIsLoading] = React.useState(!!orderId);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (orderId) {
            setIsLoading(true);
            getWorkOrderById(orderId)
                .then(data => {
                    if (data) {
                        setOrder(data);
                    } else {
                        setError('No se encontró la orden de trabajo.');
                    }
                })
                .catch(() => setError('Error al cargar la orden de trabajo.'))
                .finally(() => setIsLoading(false));
        }
    }, [orderId]);

    if (isLoading) {
        return (
            <Card>
                <div className="space-y-4 p-6">
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <div className="flex justify-end gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </div>
            </Card>
        );
    }
    
    if (error) {
        return <p className="text-destructive">{error}</p>;
    }

    return (
        <Card>
            <div className="p-6">
                <WorkOrderForm order={order} />
            </div>
        </Card>
    );
}

