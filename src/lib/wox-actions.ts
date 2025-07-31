
'use server';

import { getWoxSettings } from './settings-actions';
import type { ClientDisplay } from './schema';

type WoxClientFromList = {
    id: number;
    group_id: number;
    email: string;
    phone_number: string;
    loged_at: string;
};

type WoxClientDetails = {
    id: number;
    email: string;
    phone_number: string;
    // Add other fields from the detail endpoint if needed
};

type WoxClientListApiResponse = {
    data: WoxClientFromList[];
};

type WoxClientDetailApiResponse = {
    data: {
        client_data: {
            data: WoxClientDetails;
        }
    }
};

function mapWoxToDisplay(woxClient: WoxClientFromList): Partial<ClientDisplay> {
    return {
        id: `wox-${woxClient.id}`,
        nomSujeto: woxClient.email,
        correo: woxClient.email,
        telefono: woxClient.phone_number,
    };
}

export async function getWoxClients(): Promise<{ clients: Partial<ClientDisplay>[]; error?: string }> {
  try {
    const settings = await getWoxSettings();

    if (!settings?.url || !settings?.apiKey) {
      return { clients: [] };
    }

    const apiUrl = new URL('/api/admin/clients', settings.url);
    apiUrl.searchParams.append('user_api_hash', settings.apiKey);
    apiUrl.searchParams.append('limit', '10000');

    const response = await fetch(apiUrl.toString());

    if (!response.ok) {
      console.error(`Error fetching from WOX API: ${response.statusText}`);
      return { clients: [], error: `Error de la API de WOX: ${response.statusText}` };
    }
    
    const jsonResponse: WoxClientListApiResponse = await response.json();
    
    const mappedClients = jsonResponse.data
        .filter(client => client.group_id === 2)
        .map(mapWoxToDisplay);
    
    return { clients: mappedClients };

  } catch (error) {
    console.error("Failed to get WOX clients:", error);
    return { clients: [], error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

export async function getWoxClientDetailsById(woxId: string): Promise<Partial<ClientDisplay> | null> {
    try {
        const settings = await getWoxSettings();
        if (!settings?.url || !settings?.apiKey) {
            console.error("WOX settings are not configured.");
            return null;
        }
        
        // Remove potential 'wox-' prefix if it exists
        const numericId = woxId.replace('wox-', '');
        
        const apiUrl = new URL(`/api/client/${numericId}`, settings.url);
        apiUrl.searchParams.append('user_api_hash', settings.apiKey);

        const response = await fetch(apiUrl.toString());

        if (!response.ok) {
            console.error(`Error fetching client ${numericId} from WOX API: ${response.status} ${response.statusText}`);
            return null;
        }

        const jsonResponse: WoxClientDetailApiResponse = await response.json();
        const clientDetails = jsonResponse.data.client_data.data;
        
        if (!clientDetails) return null;

        return {
            correo: clientDetails.email,
            telefono: clientDetails.phone_number,
        };

    } catch (error) {
        console.error(`Failed to get WOX client details for id ${woxId}:`, error);
        return null;
    }
}
