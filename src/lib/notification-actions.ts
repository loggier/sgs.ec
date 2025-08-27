
'use server';

import { getMessageTemplatesForUser, getQyvooSettingsForUser } from './settings-actions';
import { sendQyvooMessage } from './qyvoo-actions';
import { getDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Client } from './schema';
import type { Unit } from './unit-schema';
import type { TemplateEventType } from './settings-schema';
import type { User } from './user-schema';
import { getAllUnits } from './unit-actions';
import { startOfDay, addDays, isSameDay, isBefore, differenceInDays } from 'date-fns';

/**
 * Replaces placeholders in a template string with actual data.
 * Handles both single-unit and multi-unit (grouped) scenarios.
 * @param template The template string with placeholders.
 * @param client The client object.
 * @param units An array of unit objects.
 * @param owner The user object of the owner/company.
 * @returns The formatted message string.
 */
function formatMessage(template: string, client: Client, units: Unit[], owner: User | null): string {
    let message = template;

    // --- Helper functions ---
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
    
    const formatCurrency = (amount?: number | null) => {
        if (amount === undefined || amount === null) return '$0.00';
        return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const getMonthlyCost = (unit: Unit): number => {
        if (unit.tipoContrato === 'con_contrato') {
            return (unit.costoTotalContrato ?? 0) / (unit.mesesContrato || 1);
        }
        return unit.costoMensual ?? 0;
    };

    const calculateOverdueAmount = (unit: Unit): number => {
      const today = startOfDay(new Date());
      if (!unit.fechaSiguientePago) return 0;
      const nextPaymentDate = startOfDay(new Date(unit.fechaSiguientePago));

      if (isBefore(today, nextPaymentDate)) {
          return 0; // Not overdue yet
      }
      
      const daysOverdue = differenceInDays(today, nextPaymentDate);
      const monthlyRate = getMonthlyCost(unit);
      
      if (monthlyRate === 0) return 0;

      // Calculate how many full 30-day periods have passed
      const monthsOverdue = Math.floor(daysOverdue / 30) + 1;
      
      return monthsOverdue * monthlyRate;
    };
    
    // --- General Replacements ---
    const generalReplacements = {
        '{nombre_cliente}': client.nomSujeto,
        '{nombre_empresa}': owner?.empresa || 'Su Proveedor de Servicios GPS',
        '{telefono_empresa}': owner?.telefono || '',
    };
    for (const [key, value] of Object.entries(generalReplacements)) {
        // Ensure value is a string to prevent errors with .replace
        message = message.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), String(value ?? ''));
    }

    // --- Build Units Summary ---
    let totalAmountDue = 0;
    const unitsSummary = units.map(unit => {
        const nextPaymentDate = formatDate(unit.fechaSiguientePago);
        const cutoffDate = unit.diasCorte !== undefined && unit.fechaSiguientePago
            ? formatDate(addDays(new Date(unit.fechaSiguientePago), unit.diasCorte))
            : 'N/A';
        const overdueAmount = calculateOverdueAmount(unit);
        const amountToPay = overdueAmount > 0 ? overdueAmount : getMonthlyCost(unit);
        totalAmountDue += amountToPay;

        return `*Placa:* ${unit.placa} | *F. Vence:* ${nextPaymentDate} | *F. Corte:* ${cutoffDate} | *Monto:* ${formatCurrency(amountToPay)}`;
    }).join('\n');

    let finalSummary = unitsSummary;
    if (units.length > 1) {
        finalSummary += `\n\n*TOTAL A PAGAR: ${formatCurrency(totalAmountDue)}*`;
    }
    
    message = message.replace(/{resumen_unidades}/g, finalSummary);
    
    // Clear individual placeholders that are now part of the summary
    const singleUnitPlaceholders = ['{placa}', '{imei}', '{modelo_unidad}', '{fecha_vencimiento}', '{fecha_corte}', '{monto_a_pagar}'];
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

        const clientDocRef = doc(db, 'clients', clientId);
        const clientDoc = await getDoc(clientDocRef);

        if (!clientDoc.exists()) {
            return { success: false, message: 'No se pudo encontrar el cliente.' };
        }
        const clientData = { id: clientDoc.id, ...clientDoc.data() } as Client;
        
        // Validation: Does the client have a phone number?
        if (!clientData.telefono) {
            return { success: true, message: `No se envió notificación: El cliente ${clientData.nomSujeto} no tiene un número de teléfono.` };
        }
        
        // Validation: Does the client have an owner?
        if (!clientData.ownerId) {
             return { success: true, message: `No se envió notificación: El cliente ${clientData.nomSujeto} no tiene un propietario asignado.` };
        }
        
        const ownerDocRef = doc(db, 'users', clientData.ownerId);
        const ownerDoc = await getDoc(ownerDocRef);
        
        // Validation: Does the owner exist?
        if (!ownerDoc.exists()) {
            return { success: true, message: `No se envió notificación: No se pudo encontrar al propietario del cliente.` };
        }
        const ownerData = ownerDoc.data() as User;
        
        // Validation: Does the owner have Qyvoo settings?
        const qyvooSettings = await getQyvooSettingsForUser(clientData.ownerId);
        if (!qyvooSettings?.apiKey || !qyvooSettings.userId) {
            return { success: true, message: `No se envió notificación: El propietario ${ownerData.nombre} no tiene configurada la integración de Qyvoo.` };
        }
        
        const allTemplates = await getMessageTemplatesForUser(clientData.ownerId);
        const template = allTemplates.find(t => t.eventType === eventType);

        if (!template) {
            return { success: true, message: `No hay plantilla configurada para el evento '${eventType}'. No se envió mensaje.` };
        }

        const messageToSend = formatMessage(template.content, clientData, units, ownerData);
        
        const logMetadata = { 
            ownerId: clientData.ownerId, 
            clientId: clientData.id!, 
            clientName: clientData.nomSujeto 
        };

        return await sendQyvooMessage(clientData.telefono, messageToSend, qyvooSettings, logMetadata);

    } catch (error) {
        console.error(`Error sending grouped templated message for event ${eventType}:`, error);
        return { success: false, message: 'Error interno al procesar la notificación agrupada.' };
    }
}


export async function triggerManualNotificationCheck(user: User): Promise<{ success: boolean; message: string }> {
    try {
        const qyvooSettings = await getQyvooSettingsForUser(user.id);
        if (!qyvooSettings?.apiKey) {
            return { success: false, message: "La integración de Qyvoo no está configurada para su usuario. Vaya a Configuración para añadir su API key." };
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
        
        const unitsToNotify = groupUnits(allUnits);
        
        let sentCount = 0;
        let errorCount = 0;

        for (const clientId in unitsToNotify) {
            const groups = unitsToNotify[clientId];
            
            if (groups.dueInThreeDays.length > 0) {
                const result = await sendGroupedTemplatedWhatsAppMessage('payment_reminder', clientId, groups.dueInThreeDays);
                if (result.success) sentCount++; else errorCount++;
            }

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
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado durante la verificación manual.";
        return { success: false, message: errorMessage };
    }
}
