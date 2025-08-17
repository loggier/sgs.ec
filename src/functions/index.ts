
/**
 * @fileoverview Funciones de nube para tareas programadas y de fondo.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { subDays, startOfDay, isSameDay, addDays } from "date-fns";
import { sendGroupedTemplatedWhatsAppMessage } from "../lib/notification-actions";
import type { Unit } from '../lib/unit-schema';

// Asegúrate de que Firebase Admin SDK esté inicializado.
// Esto se hace automáticamente en el entorno de Cloud Functions si no se ha hecho antes.
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

// Helper to convert Firestore Timestamps
const convertTimestamps = (docData: any): any => {
    const data: { [key: string]: any } = {};
    for (const key in docData) {
        if (docData[key] instanceof Timestamp) {
            data[key] = docData[key].toDate().toISOString(); // Convert to ISO String
        } else {
            data[key] = docData[key];
        }
    }
    return data;
};


// --- Funciones exportadas ---

/**
 * Función programada que se ejecuta diariamente para revisar los vencimientos
 * y enviar las notificaciones correspondientes a través de WhatsApp.
 */
export const dailyNotificationCheck = functions
    .region("us-central1") // Puedes ajustar la región
    .pubsub.schedule("every day 08:00") // Se ejecuta todos los días a las 8:00 AM
    .timeZone("America/Guayaquil") // Ajusta a tu zona horaria
    .onRun(async (context) => {
        functions.logger.info("Iniciando revisión diaria de notificaciones.", { structuredData: true });

        const now = new Date();
        const today = startOfDay(now);
        const threeDaysAgo = startOfDay(subDays(now, 3));
        const threeDaysFromNow = startOfDay(addDays(now, 3));
        
        // Group units by client and event type
        const unitsToNotify: { [clientId: string]: { dueToday: Unit[], overdue: Unit[], dueInThreeDays: Unit[] } } = {};

        try {
            const unitsSnapshot = await db.collectionGroup("units").get();

            if (unitsSnapshot.empty) {
                functions.logger.info("No hay unidades para procesar.");
                return null;
            }
            
            // Iterate over all units and group them
            for (const doc of unitsSnapshot.docs) {
                const unitData = convertTimestamps(doc.data());
                const unit = { id: doc.id, clientId: doc.ref.parent.parent!.id, ...unitData } as Unit;

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

            let processedCount = 0;
            // Send grouped notifications
            for (const clientId in unitsToNotify) {
                const groups = unitsToNotify[clientId];

                if (groups.dueInThreeDays.length > 0) {
                    await sendGroupedTemplatedWhatsAppMessage('payment_reminder', clientId, groups.dueInThreeDays);
                    functions.logger.info(`Enviando recordatorio de pago próximo para cliente ${clientId} con ${groups.dueInThreeDays.length} unidades.`);
                    processedCount++;
                }
                
                if (groups.dueToday.length > 0) {
                    await sendGroupedTemplatedWhatsAppMessage('payment_due_today', clientId, groups.dueToday);
                    functions.logger.info(`Enviando aviso de vencimiento hoy para cliente ${clientId} con ${groups.dueToday.length} unidades.`);
                    processedCount++;
                }

                if (groups.overdue.length > 0) {
                    await sendGroupedTemplatedWhatsAppMessage('payment_overdue', clientId, groups.overdue);
                    functions.logger.info(`Enviando aviso de pago vencido para cliente ${clientId} con ${groups.overdue.length} unidades.`);
                    processedCount++;
                }
            }
            
            functions.logger.info(`Proceso completado. ${processedCount} notificaciones agrupadas enviadas.`);
            return null;

        } catch (error) {
            functions.logger.error("Error al ejecutar la revisión diaria de notificaciones:", error);
            return null;
        }
    });
