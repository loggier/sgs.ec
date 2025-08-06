
'use server';

import { getMessageTemplates } from './settings-actions';
import { sendQyvooMessage } from './qyvoo-actions';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import type { Client } from './schema';
import type { Unit } from './unit-schema';
import type { TemplateEventType } from './settings-schema';
import type { User } from './user-schema';


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
