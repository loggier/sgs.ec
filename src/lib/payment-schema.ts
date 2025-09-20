

import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import type { Unit } from './unit-schema';
import type { Client } from './schema';

const dateOrTimestamp = z.union([z.instanceof(Timestamp), z.date(), z.string()]);

export const PaymentMethod = z.enum(['transferencia', 'efectivo']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const PaymentSchema = z.object({
    id: z.string(),
    unitId: z.string(),
    clientId: z.string(),
    clientName: z.string(),
    unitPlaca: z.string(),
    ownerId: z.string().optional(),
    fechaPago: dateOrTimestamp.refine(val => val !== null, 'Fecha de pago es requerida.'),
    numeroFactura: z.string().trim().min(1, 'El número de factura es requerido.'),
    monto: z.coerce.number().positive('El monto debe ser un número positivo.'),
    formaPago: PaymentMethod,
    mesesPagados: z.coerce.number().int().min(1, 'La cantidad de meses debe ser al menos 1.'),
});

export type Payment = z.infer<typeof PaymentSchema>;

export const PaymentFormSchema = PaymentSchema.omit({ 
    id: true, 
    unitId: true, 
    clientId: true, 
    clientName: true,
    unitPlaca: true,
    ownerId: true,
});
export type PaymentFormInput = z.infer<typeof PaymentFormSchema>;


// Schema for the payment form on the client list page
export const ClientPaymentFormSchema = PaymentFormSchema.extend({
    unitId: z.string().min(1, 'Debe seleccionar una unidad.'),
});
export type ClientPaymentFormInput = z.infer<typeof ClientPaymentFormSchema>;


// Type for enriched payment history records
export type PaymentHistoryEntry = Payment & {
  refPath: string; // Path to the document, used as cursor
  ownerName?: string;
};
