/**
 * @fileoverview Funciones de nube para tareas programadas y de fondo.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { addDays, startOfDay, isSameDay } from "date-fns";

// Asegúrate de que Firebase Admin SDK esté inicializado.
// Esto se hace automáticamente en el entorno de Cloud Functions si no se ha hecho antes.
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

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

        const today = startOfDay(new Date());
        const reminderDate = addDays(today, 3); // Recordatorio 3 días antes

        try {
            const unitsSnapshot = await db.collectionGroup("units").get();

            if (unitsSnapshot.empty) {
                functions.logger.info("No hay unidades para procesar.");
                return null;
            }
            
            let processedCount = 0;

            for (const doc of unitsSnapshot.docs) {
                const unit = doc.data() as { fechaSiguientePago?: Timestamp, clientId: string, id: string };
                if (!unit.fechaSiguientePago || !unit.clientId) continue;

                const nextPaymentDate = startOfDay(unit.fechaSiguientePago.toDate());

                // Determinar si se debe enviar una notificación
                if (isSameDay(nextPaymentDate, reminderDate)) {
                    // TODO: Implementar la llamada a sendTemplatedWhatsAppMessage
                    // await sendTemplatedWhatsAppMessage('payment_reminder', unit.clientId, doc.id);
                    functions.logger.info(`Enviando recordatorio de pago para unidad ${doc.id}`);
                    processedCount++;
                } else if (isSameDay(nextPaymentDate, today)) {
                    // TODO: Implementar la llamada a sendTemplatedWhatsAppMessage
                    // await sendTemplatedWhatsAppMessage('payment_due_today', unit.clientId, doc.id);
                    functions.logger.info(`Enviando aviso de vencimiento hoy para unidad ${doc.id}`);
                    processedCount++;
                } else if (nextPaymentDate < today) {
                    // TODO: Implementar la llamada a sendTemplatedWhatsAppMessage
                    // await sendTemplatedWhatsAppMessage('payment_overdue', unit.clientId, doc.id);
                    functions.logger.info(`Enviando aviso de pago vencido para unidad ${doc.id}`);
                    processedCount++;
                }
            }
            
            functions.logger.info(`Proceso completado. ${processedCount} notificaciones enviadas.`);
            return null;

        } catch (error) {
            functions.logger.error("Error al ejecutar la revisión diaria de notificaciones:", error);
            return null;
        }
    });