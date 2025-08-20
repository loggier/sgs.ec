
import { z } from 'zod';

// --- WOX Integration Settings ---
export const WoxSettingsSchema = z.object({
  url: z.string().url('Debe ser una URL válida.'),
  user: z.string().min(1, 'El usuario es requerido.'),
  apiKey: z.string().min(1, 'La API Key es requerida.'),
});

export type WoxSettings = z.infer<typeof WoxSettingsSchema>;
export type WoxSettingsFormInput = WoxSettings;

// --- Qyvoo Integration Settings ---
export const QyvooSettingsSchema = z.object({
  apiKey: z.string().min(1, 'La API Key es requerida.'),
  userId: z.string().min(1, 'El User ID es requerido.'),
});

export type QyvooSettings = z.infer<typeof QyvooSettingsSchema>;
export type QyvooSettingsFormInput = QyvooSettings;


// --- Message Template Settings ---
export const TemplateEventType = z.enum([
    'payment_reminder',
    'payment_due_today',
    'payment_overdue',
    'service_suspended',
    'service_reactivated',
    'payment_received'
]);
export type TemplateEventType = z.infer<typeof TemplateEventType>;

export const MessageTemplateSchema = z.object({
    id: z.string().optional(),
    ownerId: z.string().nullable().optional(), // ID of the master/manager who owns this template. Null for global.
    name: z.string().min(1, 'El nombre de la plantilla es requerido.'),
    eventType: TemplateEventType,
    content: z.string().min(10, 'El contenido debe tener al menos 10 caracteres.'),
    isGlobal: z.boolean().optional(), // Flag to mark as a global/default template
});
export type MessageTemplate = z.infer<typeof MessageTemplateSchema>;
export type MessageTemplateFormInput = Omit<MessageTemplate, 'id' | 'isGlobal'>;

export const templateEventLabels: Record<TemplateEventType, string> = {
    payment_reminder: 'Recordatorio de Pago Próximo',
    payment_due_today: 'Aviso de Vencimiento Hoy',
    payment_overdue: 'Notificación de Pago Vencido',
    service_suspended: 'Confirmación de Suspensión de Servicio',
    service_reactivated: 'Confirmación de Reactivación de Servicio',
    payment_received: 'Confirmación de Pago Recibido',
};

export const templateVariables = [
    // Variables generales
    { variable: '{nombre_cliente}', description: 'Nombre completo del cliente.' },
    { variable: '{nombre_empresa}', description: 'Nombre de su empresa (configurado en Perfil).' },
    { variable: '{telefono_empresa}', description: 'Teléfono de su empresa (configurado en Perfil).' },
    
    // Variable para resumen de múltiples unidades
    { variable: '{resumen_unidades}', description: 'Tabla con el resumen de múltiples unidades.'},

    // Variables para una sola unidad
    { variable: '{placa}', description: 'Placa de la unidad.' },
    { variable: '{imei}', description: 'IMEI de la unidad.' },
    { variable: '{modelo_unidad}', description: 'Modelo de la unidad.' },
    { variable: '{fecha_vencimiento}', description: 'Fecha del próximo pago de la unidad.' },
    { variable: '{fecha_corte}', description: 'Fecha de corte (suspensión) de la unidad.' },
    { variable: '{monto_a_pagar}', description: 'Costo mensual o cuota del contrato de la unidad.' },
];
