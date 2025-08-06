
'use server';

import { getQyvooSettings } from './settings-actions';

const QYVOO_API_URL = 'https://admin.qyvoo.com/api/send-message';

// Function to format phone number for Qyvoo (e.g., add country code if missing)
// This is a basic example, might need adjustment based on your data format.
function formatPhoneNumber(phone: string): string {
    // Remove non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Example: If number starts with 09, replace with 5939 (Ecuador code)
    if (cleaned.startsWith('09')) {
        cleaned = '593' + cleaned.substring(1);
    } else if (cleaned.startsWith('9')) {
        cleaned = '593' + cleaned;
    }
    
    // Qyvoo might not need the '+' symbol, just the digits.
    // Adjust as per Qyvoo's specific requirements.
    return cleaned;
}

export async function sendQyvooMessage(
    phoneNumber: string,
    message: string
): Promise<{ success: boolean; message: string }> {
    try {
        const settings = await getQyvooSettings();
        if (!settings?.apiKey) {
            return { success: false, message: 'La integración con Qyvoo no está configurada (Falta API Key).' };
        }

        const formattedNumber = formatPhoneNumber(phoneNumber);

        const response = await fetch(QYVOO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                apiKey: settings.apiKey,
                number: formattedNumber,
                message: message,
            }),
        });

        const responseBody = await response.json();

        if (!response.ok || !responseBody.success) {
            const errorMessage = responseBody.message || `Error de la API de Qyvoo: ${response.statusText}`;
            console.error(`Error sending message via Qyvoo API: ${response.status} ${errorMessage}`, responseBody);
            return { success: false, message: `No se pudo enviar el mensaje: ${errorMessage}` };
        }

        return { success: true, message: responseBody.message };

    } catch (error) {
        console.error("Failed to send Qyvoo message:", error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
        return { success: false, message: `Error inesperado: ${errorMessage}` };
    }
}
