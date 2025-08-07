
'use server';

import { getMessageTemplates, getQyvooSettings } from './settings-actions';
import { sendQyvooMessage } from './qyvoo-actions';
import { getDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Client } from './schema';
import type { Unit } from './unit-schema';
import type { TemplateEventType } from './settings-schema';
import type { User } from './user-schema';
import { getAllUnits } from './unit-actions';
import { startOfDay, isSameDay, subDays } from 'date-fns';

/**
 * Replaces placeholders in a template string with actual data.
 * @param template The template string with placeholders like {nombre_cliente}.
 * @param client The client object.
 * @param unit The unit object.
 * @param owner The user object of the owner/company.
 * @returns The formatted message string.
 */
function formatMessage(template: string, client: Client, unit: Unit, owner: User | null): string {
    let message = template;
    const today = new Date();

    const replacements = {
        '{nombre_cliente}': client.nomSujeto,
        '{placa_unidad}': unit.placa,
        '{fecha_vencimiento}': unit.fechaSiguientePago ? new Date(unit.fechaSiguientePago).toLocaleDateString('es-EC') : 'N/A',
        '{monto_vencido}': '0.00', // Placeholder, needs real calculation logic
        '{nombre_empresa}': owner?.empresa || 'Su Proveedor de Servicios GPS',
        '{telefono_empresa}': owner?.telefono || '',
    };

    for (const [key, value] of Object.entries(replacements)) {
        message = message.replace(new RegExp(key, 'g'), value);
    }

    return message;
}


/**
 * Finds the appropriate template, formats it, and sends a WhatsApp message.
 * @param eventType The type of event triggering the notification.
 * @param clientId The ID of the client.
 * @param unitId The ID of the unit.
 */
export async function sendTemplatedWhatsAppMessage(
    eventType: TemplateEventType,
    clientId: string,
    unitId: string
): Promise<{ success: boolean; message: string }> {
    try {
        // 1. Get all available templates
        const allTemplates = await getMessageTemplates();
        const template = allTemplates.find(t => t.eventType === eventType);

        // If no template is configured for this event, we do nothing.
        if (!template) {
            return { success: true, message: `No hay plantilla configurada para el evento '${eventType}'. No se envió mensaje.` };
        }

        // 2. Get necessary data
        const clientDocRef = doc(db, 'clients', clientId);
        const unitDocRef = doc(db, 'clients', clientId, 'units', unitId);
        
        const [clientDoc, unitDoc] = await Promise.all([
            getDoc(clientDocRef),
            getDoc(unitDocRef)
        ]);

        if (!clientDoc.exists() || !unitDoc.exists()) {
            return { success: false, message: 'No se pudo encontrar el cliente o la unidad.' };
        }

        const clientData = clientDoc.data() as Client;
        const unitData = { id: unitDoc.id, clientId, ...unitDoc.data() } as Unit;

        if (!clientData.telefono) {
            return { success: false, message: 'El cliente no tiene un número de teléfono para notificar.' };
        }
        
        // This is a check from the original logic and might need to be refined if ownerId is optional on client
        if (!clientData.ownerId) {
             return { success: false, message: 'El cliente no tiene un propietario asignado.' };
        }
        
        const ownerDocRef = doc(db, 'users', clientData.ownerId);
        const ownerDoc = await getDoc(ownerDocRef);
        const ownerData = ownerDoc.exists() ? ownerDoc.data() as User : null;

        // 3. Format the message
        const messageToSend = formatMessage(template.content, clientData, unitData, ownerData);

        // 4. Send the message
        return await sendQyvooMessage(clientData.telefono, messageToSend);

    } catch (error) {
        console.error(`Error sending templated message for event ${eventType}:`, error);
        return { success: false, message: 'Error interno al procesar la notificación.' };
    }
}


export async function triggerManualNotificationCheck(user: User): Promise<{ success: boolean; message: string }> {
    try {
        const qyvooSettings = await getQyvooSettings();
        if (!qyvooSettings?.apiKey) {
            return { success: false, message: "La integración de Qyvoo no está configurada. Agregue una API key en la sección de Configuración." };
        }

        const allUnits = await getAllUnits(user);
        if (allUnits.length === 0) {
            return { success: true, message: "No se encontraron unidades para verificar." };
        }

        const today = startOfDay(new Date());
        const threeDaysOverdueDate = subDays(today, 3);
        let sentCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const unit of allUnits) {
            if (!unit.fechaSiguientePago) {
                skippedCount++;
                continue;
            }
            
            const nextPaymentDate = startOfDay(new Date(unit.fechaSiguientePago));
            let eventType: TemplateEventType | null = null;
            
            if (isSameDay(nextPaymentDate, today)) {
                eventType = 'payment_due_today';
            } else if (isSameDay(nextPaymentDate, threeDaysOverdueDate)) {
                eventType = 'payment_overdue';
            }
            
            if (eventType) {
                const result = await sendTemplatedWhatsAppMessage(eventType, unit.clientId, unit.id);
                if (result.success) {
                    sentCount++;
                } else {
                    console.error(`Failed to send notification for unit ${unit.id}: ${result.message}`);
                    errorCount++;
                }
            } else {
                skippedCount++;
            }
        }
        
        if (sentCount === 0 && errorCount === 0) {
             return {
                success: true,
                message: "Proceso finalizado. Ninguna unidad cumplió con los criterios para enviar notificaciones hoy."
            };
        }

        return {
            success: true,
            message: `Proceso finalizado. ${sentCount} notificaciones enviadas, ${errorCount} errores, ${skippedCount} unidades omitidas (no cumplen criterios).`
        };

    } catch (error) {
        console.error("Error triggering manual notification check:", error);
        return { success: false, message: "Ocurrió un error inesperado durante la verificación manual." };
    }
}
