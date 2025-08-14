
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
import { startOfDay, isSameDay, subDays, add, parseISO, addDays } from 'date-fns';

/**
 * Replaces placeholders in a template string with actual data for a group of units.
 * @param template The template string with placeholders like {nombre_cliente}.
 * @param client The client object.
 * @param units An array of unit objects.
 * @param owner The user object of the owner/company.
 * @returns The formatted message string.
 */
function formatGroupedMessage(template: string, client: Client, units: Unit[], owner: User | null): string {
    let message = template;

    // Helper to format a single date safely
    const formatDate = (dateInput: any): string => {
        if (!dateInput) return 'N/A';
        try {
            const date = dateInput instanceof Timestamp ? dateInput.toDate() : new Date(dateInput);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        } catch (e) {
            return 'Fecha Inválida';
        }
    };
    
    // Create the summary string for all units
    const unitsSummary = units.map(unit => {
        const nextPaymentDate = formatDate(unit.fechaSiguientePago);
        const cutoffDate = unit.diasCorte !== undefined && unit.fechaSiguientePago 
            ? formatDate(addDays(new Date(unit.fechaSiguientePago), unit.diasCorte))
            : 'N/A';
        
        return `Placa: ${unit.placa} | Vence: ${nextPaymentDate} | Corte: ${cutoffDate}`;
    }).join('\n'); // Join with newlines for a list format

    const replacements = {
        '{nombre_cliente}': client.nomSujeto,
        '{nombre_empresa}': owner?.empresa || 'Su Proveedor de Servicios GPS',
        '{telefono_empresa}': owner?.telefono || '',
        '{resumen_unidades}': unitsSummary, // New placeholder for the grouped summary
    };

    for (const [key, value] of Object.entries(replacements)) {
        message = message.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }
    
    // The individual placeholders are now deprecated for grouped messages, but we clear them just in case
    const singleUnitPlaceholders = ['{placa_unidad}', '{fecha_vencimiento}', '{monto_vencido}'];
    singleUnitPlaceholders.forEach(placeholder => {
        message = message.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), '');
    });


    return message;
}


/**
 * Finds the appropriate template, formats it for a group of units, and sends a single WhatsApp message.
 * @param eventType The type of event triggering the notification.
 * @param clientId The ID of the client.
 * @param units An array of unit objects to include in the notification.
 */
export async function sendGroupedTemplatedWhatsAppMessage(
    eventType: TemplateEventType,
    clientId: string,
    units: Unit[]
): Promise<{ success: boolean; message: string }> {
    try {
        if (!units || units.length === 0) {
            return { success: false, message: 'No hay unidades para notificar.' };
        }

        const allTemplates = await getMessageTemplates();
        const template = allTemplates.find(t => t.eventType === eventType);

        if (!template) {
            return { success: true, message: `No hay plantilla configurada para el evento '${eventType}'. No se envió mensaje.` };
        }

        const clientDocRef = doc(db, 'clients', clientId);
        const clientDoc = await getDoc(clientDocRef);

        if (!clientDoc.exists()) {
            return { success: false, message: 'No se pudo encontrar el cliente.' };
        }

        const clientData = clientDoc.data() as Client;
        
        if (!clientData.telefono) {
            return { success: false, message: 'El cliente no tiene un número de teléfono para notificar.' };
        }
        
        if (!clientData.ownerId) {
             return { success: false, message: 'El cliente no tiene un propietario asignado.' };
        }
        
        const ownerDocRef = doc(db, 'users', clientData.ownerId);
        const ownerDoc = await getDoc(ownerDocRef);
        const ownerData = ownerDoc.exists() ? ownerDoc.data() as User : null;

        const messageToSend = formatGroupedMessage(template.content, clientData, units, ownerData);

        return await sendQyvooMessage(clientData.telefono, messageToSend);

    } catch (error) {
        console.error(`Error sending grouped templated message for event ${eventType}:`, error);
        return { success: false, message: 'Error interno al procesar la notificación agrupada.' };
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

        const timeZone = "America/Guayaquil";
        const now = new Date(new Date().toLocaleString('en-US', { timeZone }));
        const todayStr = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(now);
        const threeDaysAgoStr = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(subDays(now, 3));
        
        // Group units by client and event type
        const unitsToNotify: { [clientId: string]: { dueToday: Unit[], overdue: Unit[] } } = {};

        for (const unit of allUnits) {
            if (!unit.fechaSiguientePago) continue;
            
            const nextPaymentDate = new Date(unit.fechaSiguientePago);
            const nextPaymentDateStr = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(nextPaymentDate);
            
            if (!unitsToNotify[unit.clientId]) {
                unitsToNotify[unit.clientId] = { dueToday: [], overdue: [] };
            }

            if (nextPaymentDateStr === todayStr) {
                unitsToNotify[unit.clientId].dueToday.push(unit);
            } else if (nextPaymentDateStr === threeDaysAgoStr) {
                unitsToNotify[unit.clientId].overdue.push(unit);
            }
        }
        
        let sentCount = 0;
        let errorCount = 0;

        for (const clientId in unitsToNotify) {
            const groups = unitsToNotify[clientId];

            if (groups.dueToday.length > 0) {
                const result = await sendGroupedTemplatedWhatsAppMessage('payment_due_today', clientId, groups.dueToday);
                if (result.success) sentCount++; else errorCount++;
            }

            if (groups.overdue.length > 0) {
                const result = await sendGroupedTemplatedWhatsAppMessage('payment_overdue', clientId, groups.overdue);
                if (result.success) sentCount++; else errorCount++;
            }
        }
        
        if (sentCount === 0 && errorCount === 0) {
             return {
                success: true,
                message: "Proceso finalizado. Ningún cliente tenía unidades que cumplieran con los criterios para enviar notificaciones hoy."
            };
        }

        return {
            success: true,
            message: `Proceso finalizado. Se enviaron ${sentCount} notificaciones agrupadas. Hubo ${errorCount} errores.`
        };

    } catch (error) {
        console.error("Error triggering manual notification check:", error);
        return { success: false, message: "Ocurrió un error inesperado durante la verificación manual." };
    }
}
