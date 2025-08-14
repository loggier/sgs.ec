
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
    name: z.string().min(1, 'El nombre de la plantilla es requerido.'),
    eventType: TemplateEventType,
    content: z.string().min(10, 'El contenido debe tener al menos 10 caracteres.'),
});
export type MessageTemplate = z.infer<typeof MessageTemplateSchema>;
export type MessageTemplateFormInput = Omit<MessageTemplate, 'id'>;

export const templateEventLabels: Record<TemplateEventType, string> = {
    payment_reminder: 'Recordatorio de Pago Próximo',
    payment_due_today: 'Aviso de Vencimiento Hoy',
    payment_overdue: 'Notificación de Pago Vencido',
    service_suspended: 'Confirmación de Suspensión de Servicio',
    service_reactivated: 'Confirmación de Reactivación de Servicio',
    payment_received: 'Confirmación de Pago Recibido',
};

export const templateVariables = [
    { variable: '{nombre_cliente}', description: 'Nombre completo del cliente.' },
    { variable: '{resumen_unidades}', description: 'Tabla con el resumen de las unidades a notificar.'},
    { variable: '{nombre_empresa}', description: 'Nombre de su empresa (configurado en Perfil).' },
    { variable: '{telefono_empresa}', description: 'Teléfono de su empresa (configurado en Perfil).' },
];
