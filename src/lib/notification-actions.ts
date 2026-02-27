'use server';

import { getMessageTemplatesForUser, getNotificationUrlForUser } from './settings-actions';
import type { NotificationSettings } from './settings-schema';
import { createMessageLog } from './log-actions';
import { getDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Client } from './schema';
import type { Unit } from './unit-schema';
import type { TemplateEventType } from './settings-schema';
import type { User } from './user-schema';
import { getAllUnits } from './unit-actions';
import { startOfDay, addDays, isSameDay, isBefore, differenceInDays } from 'date-fns';

// Function to format phone number for the notification URL
function formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('09')) {
        cleaned = '593' + cleaned.substring(1);
    } else if (cleaned.startsWith('9')) {
        cleaned = '593' + cleaned;
    }
    
    return cleaned;
}

export async function sendNotificationMessage(
    phoneNumber: string,
    message: string,
    settings: NotificationSettings | null,
    logMetadata: { ownerId: string; clientId: string; clientName: string; }
): Promise<{ success: boolean; message: string }> {

    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
        return { success: true, message: 'Operación omitida: No se proporcionó un número de teléfono válido para la notificación.' };
    }
    
    const formattedNumber = formatPhoneNumber(phoneNumber);
    const logPayloadBase = {
        ownerId: logMetadata.ownerId,
        qyvooUserId: settings?.notificationUrl || 'URL no configurada', // Log the URL for reference
        recipientNumber: formattedNumber,
        clientId: logMetadata.clientId,
        clientName: logMetadata.clientName,
        messageContent: message,
    };
    
    try {
        if (!settings?.notificationUrl) {
            const errorMsg = 'La URL de notificaciones no está configurada.';
            // Do not create a log here because the calling function should handle the skip.
            // This is a safeguard.
            return { success: false, message: errorMsg };
        }

        // Construct the final URL
        const finalUrl = settings.notificationUrl
            .replace('NUMBER', encodeURIComponent(formattedNumber))
            .replace('TEXT', encodeURIComponent(message));

        const response = await fetch(finalUrl, {
            method: 'GET', // Or 'POST' if the API requires it
            headers: {
                'Accept': 'application/json',
            },
        });

        const responseBody = await response.json().catch(() => ({})); // Handle cases where response is not JSON

        if (!response.ok) {
            const errorMessage = responseBody?.message || responseBody?.error || `Error de la API: ${response.statusText}`;
            console.error(`Error sending message via URL: ${response.status} ${errorMessage}`, responseBody);
            await createMessageLog({ ...logPayloadBase, status: 'failure', errorMessage });
            return { success: false, message: `No se pudo enviar el mensaje: ${errorMessage}` };
        }
        
        await createMessageLog({ ...logPayloadBase, status: 'success' });
        return { success: true, message: responseBody.message || 'Mensaje enviado para procesamiento.' };

    } catch (error) {
        console.error("Failed to send notification message:", error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
        await createMessageLog({ ...logPayloadBase, status: 'failure', errorMessage });
        return { success: false, message: `Error inesperado: ${errorMessage}` };
    }
}


function formatMessage(template: string, client: Client, units: Unit[], owner: User): string {
    let message = template;

    const formatDate = (dateInput: any): string => {
        if (!dateInput) return '[Fecha no disponible]';
        try {
            const date = dateInput instanceof Timestamp ? dateInput.toDate() : new Date(dateInput);
            if (isNaN(date.getTime())) return '[Fecha inválida]';
            return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        } catch (e) {
            return '[Error de fecha]';
        }
    };
    
    const formatCurrency = (amount?: number | null) => {
        if (amount === undefined || amount === null) return '$0.00';
        return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const getMonthlyCost = (unit: Unit): number => {
        if (!unit) return 0;
        if (unit.tipoContrato === 'con_contrato') {
            return (unit.costoTotalContrato ?? 0) / (unit.mesesContrato || 1);
        }
        return unit.costoMensual ?? 0;
    };

    const calculateOverdueAmount = (unit: Unit): number => {
      if (!unit) return 0;
      const today = startOfDay(new Date());
      if (!unit.fechaSiguientePago) return 0;
      const nextPaymentDate = startOfDay(new Date(unit.fechaSiguientePago));

      if (isBefore(today, nextPaymentDate)) {
          return 0;
      }
      
      const daysOverdue = differenceInDays(today, nextPaymentDate);
      const monthlyRate = getMonthlyCost(unit);
      
      if (monthlyRate === 0) return 0;

      const monthsOverdue = Math.floor(daysOverdue / 30) + 1;
      return monthsOverdue * monthlyRate;
    };
    
    message = message.replace(/{nombre_cliente}/g, client?.nomSujeto || '[Cliente no disponible]');
    message = message.replace(/{nombre_empresa}/g, owner?.empresa || '[Su Proveedor]');
    message = message.replace(/{telefono_empresa}/g, owner?.telefono || '[Contacto no disponible]');

    const unitsSummaryLines: string[] = [];
    if (units && units.length > 0) {
        let totalAmountDue = 0;
        units.forEach(unit => {
            if (!unit) return;
            const nextPaymentDate = formatDate(unit.fechaSiguientePago);
            
            const cutoffDate = (unit.diasCorte !== undefined && unit.diasCorte !== null && unit.fechaSiguientePago)
                ? formatDate(addDays(new Date(unit.fechaSiguientePago), unit.diasCorte))
                : '[N/A]';

            const overdueAmount = calculateOverdueAmount(unit);
            const amountToPay = overdueAmount > 0 ? overdueAmount : getMonthlyCost(unit);
            totalAmountDue += amountToPay;
            
            const placa = unit.placa || '[Placa no disp.]';
            const monto = formatCurrency(amountToPay);
            unitsSummaryLines.push(`*Placa:* ${placa} | *F. Vence:* ${nextPaymentDate} | *F. Corte:* ${cutoffDate} | *Monto:* ${monto}`);
        });
        
        if (unitsSummaryLines.length > 0) {
            const finalSummary = unitsSummaryLines.join('\n');
            const totalLine = unitsSummaryLines.length > 1 ? `\n\n*TOTAL A PAGAR: ${formatCurrency(totalAmountDue)}*` : '';
            message = message.replace(/{resumen_unidades}/g, `${finalSummary}${totalLine}`);
        }
    }
    
    message = message.replace(/{resumen_unidades}/g, '[No hay detalles de unidades disponibles]');
    const singleUnitPlaceholders = ['{placa}', '{imei}', '{modelo_unidad}', '{fecha_vencimiento}', '{fecha_corte}', '{monto_a_pagar}'];
    singleUnitPlaceholders.forEach(placeholder => {
        message = message.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), '');
    });

    return message;
}

export async function sendGroupedTemplatedWhatsAppMessage(
    client: Client,
    units: Unit[],
    eventType: TemplateEventType
): Promise<{ success: boolean; message: string }> {
    
    // --- 1. Validate all data before proceeding ---
    if (!client.telefono) {
        return { success: true, message: `Operación omitida: Cliente ${client.nomSujeto} no tiene teléfono.` };
    }
    
    const ownerId = client.ownerId;
    if (!ownerId) {
        return { success: true, message: `Operación omitida: Cliente ${client.nomSujeto} no tiene propietario.` };
    }

    const ownerDoc = await getDoc(doc(db, 'users', ownerId)).catch(() => null);
     if (!ownerDoc || !ownerDoc.exists()) {
        return { success: true, message: `Operación omitida: Propietario ${ownerId} no encontrado.` };
    }
    const ownerData = ownerDoc.data() as User;
    
    const notificationSettings = await getNotificationUrlForUser(ownerId);
    if (!notificationSettings?.notificationUrl) {
        return { success: true, message: `Operación omitida: Propietario ${ownerData.nombre} no tiene URL de notificación configurada.` };
    }
    
    const allTemplates = await getMessageTemplatesForUser(ownerId);
    const template = allTemplates.find(t => t.eventType === eventType);

    if (!template?.content) {
        return { success: true, message: `Operación omitida: No hay plantilla válida para el evento '${eventType}'.` };
    }

    if (!template.isActive) {
        return { success: true, message: `Operación omitida: La plantilla para '${eventType}' está desactivada.` };
    }

    if (!units || units.length === 0) {
        return { success: true, message: 'Operación completada. No hay unidades para notificar.' };
    }

    // --- 2. Format and send the message ---
    const messageToSend = formatMessage(template.content, client, units, ownerData);
    
    if (!messageToSend.trim()) {
        return { success: true, message: `El mensaje para '${eventType}' resultó vacío después de formatear. No se envió.` };
    }
    
    const logMetadata = { 
        ownerId: ownerId!, 
        clientId: client.id!, 
        clientName: client.nomSujeto 
    };

    return await sendNotificationMessage(client.telefono, messageToSend, notificationSettings, logMetadata);
}


export async function triggerManualNotificationCheck(user: User): Promise<{ success: boolean; message: string }> {
    try {
        const notificationSettings = await getNotificationUrlForUser(user.id);
        if (!notificationSettings?.notificationUrl) {
            return { success: false, message: "La URL de notificaciones no está configurada para su usuario. Vaya a Configuración para añadirla." };
        }

        const allUnits = await getAllUnits(user);
        if (allUnits.length === 0) {
            return { success: true, message: "No se encontraron unidades para verificar." };
        }
        
        const today = startOfDay(new Date());
        const threeDaysAgo = startOfDay(new Date(new Date().setDate(new Date().getDate() - 3)));
        const threeDaysFromNow = startOfDay(addDays(new Date(), 3));


        const groupUnits = (units: Unit[]) => {
            const unitsToNotify: { [clientId: string]: { dueToday: Unit[], overdue: Unit[], dueInThreeDays: Unit[] } } = {};

            for (const unit of units) {
                if (!unit.fechaSiguientePago) continue;
                
                // Omitir unidades que ya están suspendidas
                if (unit.estaSuspendido) continue;
                
                const nextPaymentDate = startOfDay(new Date(unit.fechaSiguientePago));

                if (!unitsToNotify[unit.clientId]) {
                    unitsToNotify[unit.clientId] = { dueToday: [], overdue: [], dueInThreeDays: [] };
                }
                
                if (isSameDay(nextPaymentDate, threeDaysFromNow)) {
                     unitsToNotify[unit.clientId].dueInThreeDays.push(unit);
                } else if (isSameDay(nextPaymentDate, today)) {
                    unitsToNotify[unit.clientId].dueToday.push(unit);
                } else if (isSameDay(nextPaymentDate, threeDaysAgo)) {
                    unitsToNotify[unit.clientId].overdue.push(unit);
                }
            }
            return unitsToNotify;
        };
        
        const unitsByClient = groupUnits(allUnits);
        
        let sentCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const clientId in unitsByClient) {
            const groups = unitsByClient[clientId];
            const clientDoc = await getDoc(doc(db, 'clients', clientId));
            if (!clientDoc.exists()) continue;
            const clientData = {id: clientDoc.id, ...clientDoc.data()} as Client;
            
            if (groups.dueInThreeDays.length > 0) {
                const result = await sendGroupedTemplatedWhatsAppMessage(clientData, groups.dueInThreeDays, 'payment_reminder');
                if (result.success && !result.message.startsWith('Operación omitida')) sentCount++;
                else if (!result.success) errorCount++;
                else skippedCount++;
            }

            if (groups.dueToday.length > 0) {
                const result = await sendGroupedTemplatedWhatsAppMessage(clientData, groups.dueToday, 'payment_due_today');
                if (result.success && !result.message.startsWith('Operación omitida')) sentCount++;
                else if (!result.success) errorCount++;
                else skippedCount++;
            }

            if (groups.overdue.length > 0) {
                const result = await sendGroupedTemplatedWhatsAppMessage(clientData, groups.overdue, 'payment_overdue');
                if (result.success && !result.message.startsWith('Operación omitida')) sentCount++;
                else if (!result.success) errorCount++;
                else skippedCount++;
            }
        }
        
        if (sentCount === 0 && errorCount === 0) {
             return {
                success: true,
                message: "Proceso finalizado. Ningún cliente tenía unidades activas que cumplieran con los criterios para enviar notificaciones hoy."
            };
        }

        return {
            success: true,
            message: `Proceso finalizado. ${sentCount} notificaciones enviadas, ${errorCount} errores, ${skippedCount} omitidas por configuración.`
        };

    } catch (error) {
        console.error("Error triggering manual notification check:", error);
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado durante la verificación manual.";
        return { success: false, message: errorMessage };
    }
}
