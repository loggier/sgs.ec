
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
 * This function assumes all data passed to it is valid and non-null.
 * @param template The template string with placeholders.
 * @param client The client object.
 * @param units An array of unit objects.
 * @param owner The user object of the owner/company.
 * @returns The formatted message string.
 */
function formatMessage(template: string, client: Client, units: Unit[], owner: User): string {
    if (!template) return ''; // Safety check

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

      const monthsOverdue = Math.floor(daysOverdue / 30) + 1;
      return monthsOverdue * monthlyRate;
    };
    
    // --- General Replacements ---
    message = message.replace(/{nombre_cliente}/g, client.nomSujeto || 'Cliente');
    message = message.replace(/{nombre_empresa}/g, owner.empresa || 'Su Proveedor GPS');
    message = message.replace(/{telefono_empresa}/g, owner.telefono || '');

    // --- Build Units Summary ---
    const unitsSummaryLines: string[] = [];

    if (units && units.length > 0) {
        let totalAmountDue = 0;
        units.forEach(unit => {
            const nextPaymentDate = formatDate(unit.fechaSiguientePago);
            const cutoffDate = unit.diasCorte !== undefined && unit.fechaSiguientePago
                ? formatDate(addDays(new Date(unit.fechaSiguientePago), unit.diasCorte))
                : 'N/A';
            const overdueAmount = calculateOverdueAmount(unit);
            const amountToPay = overdueAmount > 0 ? overdueAmount : getMonthlyCost(unit);
            totalAmountDue += amountToPay;

            unitsSummaryLines.push(`*Placa:* ${unit.placa} | *F. Vence:* ${nextPaymentDate} | *F. Corte:* ${cutoffDate} | *Monto:* ${formatCurrency(amountToPay)}`);
        });
        
        const finalSummary = unitsSummaryLines.join('\n');
        
        if (unitsSummaryLines.length > 0) {
            const totalLine = unitsSummaryLines.length > 1 ? `\n\n*TOTAL A PAGAR: ${formatCurrency(totalAmountDue)}*` : '';
            message = message.replace(/{resumen_unidades}/g, `${finalSummary}${totalLine}`);
        }
    }
    
    // Clean up any remaining placeholders if they were not replaced
    message = message.replace(/{resumen_unidades}/g, '');
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
        // --- 1. Fetch all necessary data ---
        if (!units || units.length === 0) {
            return { success: true, message: 'Operación completada. No hay unidades para notificar.' };
        }

        const clientDoc = await getDoc(doc(db, 'clients', clientId));
        const clientData = clientDoc.exists() ? { id: clientDoc.id, ...clientDoc.data() } as Client : null;

        const ownerId = clientData?.ownerId;
        const ownerDoc = ownerId ? await getDoc(doc(db, 'users', ownerId)) : null;
        const ownerData = ownerDoc?.exists() ? ownerDoc.data() as User : null;
        
        const qyvooSettings = ownerId ? await getQyvooSettingsForUser(ownerId) : null;
        const allTemplates = ownerId ? await getMessageTemplatesForUser(ownerId) : [];
        const template = allTemplates.find(t => t.eventType === eventType);

        // --- 2. Validate all data before proceeding ---
        if (!clientData) {
            return { success: true, message: `Operación completada. Cliente ${clientId} no encontrado.` };
        }
        if (!clientData.telefono) {
            return { success: true, message: `Operación completada. Cliente ${clientData.nomSujeto} no tiene teléfono.` };
        }
        if (!ownerData) {
            return { success: true, message: `Operación completada. Cliente ${clientData.nomSujeto} no tiene propietario válido.` };
        }
        if (!ownerData.empresa) {
            return { success: true, message: `Operación completada. Propietario ${ownerData.nombre} no tiene nombre de empresa configurado.`};
        }
        if (!qyvooSettings?.apiKey || !qyvooSettings.userId) {
            return { success: true, message: `Operación completada. Propietario ${ownerData.nombre} no tiene Qyvoo configurado.` };
        }
        if (!template?.content) {
            return { success: true, message: `Operación completada. No hay plantilla válida para el evento '${eventType}'.` };
        }

        // --- 3. Format and send the message ---
        const messageToSend = formatMessage(template.content, clientData, units, ownerData);
        
        if (!messageToSend.trim()) {
            return { success: true, message: `El mensaje para '${eventType}' resultó vacío después de formatear. No se envió.` };
        }
        
        const logMetadata = { 
            ownerId: ownerId!, 
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
