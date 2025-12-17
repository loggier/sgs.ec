
'use server';

import type { NotificationSettings } from './settings-schema';
import { createMessageLog } from './log-actions';

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
            // Do not create a log here, as the UI will prevent this action.
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
