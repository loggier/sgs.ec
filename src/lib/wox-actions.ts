
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

export type WoxDevice = {
    id: number;
    name: string;
    imei: string;
    online: 'online' | 'offline'; // Status of the device
    time: string; // Last connection time (e.g., "2024-05-20 15:30:00")
    fuel_quantity: string;
    fuel_measurement_id: string;
    tail_length: string;
    tail_color: string;
};

type WoxDeviceListApiResponse = {
    data: { id: number, name: string, imei: string }[];
};

type WoxDeviceDetailApiResponse = {
    item: WoxDevice;
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


export async function getWoxDevicesByClientId(woxClientId: string): Promise<{ devices: { id: number, name: string, imei: string }[]; error?: string }> {
    try {
        const settings = await getWoxSettings();
        if (!settings?.url || !settings?.apiKey) {
            return { devices: [], error: 'WOX settings are not configured.' };
        }

        const numericId = woxClientId.replace('wox-', '');
        const apiUrl = new URL(`/api/client/${numericId}/devices`, settings.url);
        apiUrl.searchParams.append('user_api_hash', settings.apiKey);

        const response = await fetch(apiUrl.toString());

        if (!response.ok) {
            console.error(`Error fetching devices from WOX API: ${response.status} ${response.statusText}`);
            return { devices: [], error: `Error de la API de WOX: ${response.statusText}` };
        }

        const jsonResponse: WoxDeviceListApiResponse = await response.json();
        return { devices: jsonResponse.data || [] };

    } catch (error) {
        console.error(`Failed to get WOX devices for client ${woxClientId}:`, error);
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return { devices: [], error: message };
    }
}

export async function getWoxDeviceDetails(deviceId: string): Promise<{ device: WoxDevice | null; error?: string }> {
    try {
        const settings = await getWoxSettings();
        if (!settings?.url || !settings?.apiKey) {
            return { device: null, error: 'WOX settings are not configured.' };
        }

        const apiUrl = new URL(`/api/devices/${deviceId}`, settings.url);
        apiUrl.searchParams.append('user_api_hash', settings.apiKey);

        const response = await fetch(apiUrl.toString());
        if (!response.ok) {
             console.error(`Error fetching device ${deviceId} from WOX API: ${response.status} ${response.statusText}`);
            return { device: null, error: `Error de la API de WOX: ${response.statusText}` };
        }
        
        const jsonResponse: WoxDeviceDetailApiResponse = await response.json();
        
        return { device: jsonResponse.item || null };

    } catch (error) {
        console.error(`Failed to get WOX device details for id ${deviceId}:`, error);
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return { device: null, error: message };
    }
}
