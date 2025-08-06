
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
    active: boolean;
    protocol: string;
    plate_number: string;
    user_id: number;
    // Fields from detailed endpoint
    sim_number?: string;
    device_model?: string;
    vin?: string;
    registration_number?: string;
    object_owner?: string;
    additional_notes?: string;
    expiration_date?: string | null;
    engine_status?: boolean;
    stop_duration?: string;
    moved_timestamp?: number;
};


// This response type is for the /api/admin/client/{id}/devices endpoint
type WoxDeviceListForClientApiResponse = {
    data: WoxDevice[];
};


// This type now expects the structure from /api/admin/device/{id}
type WoxDeviceDetailApiResponse = {
    status: number;
    data: WoxDevice;
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
      console.error(`Error fetching from P. GPS API: ${response.statusText}`);
      return { clients: [], error: `Error de la API de P. GPS: ${response.statusText}` };
    }
    
    const jsonResponse: WoxClientListApiResponse = await response.json();
    
    const mappedClients = jsonResponse.data
        .filter(client => client.group_id === 2)
        .map(mapWoxToDisplay);
    
    return { clients: mappedClients };

  } catch (error) {
    console.error("Failed to get P. GPS clients:", error);
    return { clients: [], error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

export async function getWoxClientDetailsById(woxId: string): Promise<Partial<ClientDisplay> | null> {
    try {
        const settings = await getWoxSettings();
        if (!settings?.url || !settings?.apiKey) {
            console.error("P. GPS settings are not configured.");
            return null;
        }
        
        const numericId = woxId.replace('wox-', '');
        
        const apiUrl = new URL(`/api/client/${numericId}`, settings.url);
        apiUrl.searchParams.append('user_api_hash', settings.apiKey);

        const response = await fetch(apiUrl.toString());

        if (!response.ok) {
            console.error(`Error fetching client ${numericId} from P. GPS API: ${response.status} ${response.statusText}`);
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
        console.error(`Failed to get P. GPS client details for id ${woxId}:`, error);
        return null;
    }
}


export async function getWoxDevicesByClientId(clientWoxId: string): Promise<{ devices: WoxDevice[]; error?: string }> {
    try {
        const settings = await getWoxSettings();
        if (!settings?.url || !settings?.apiKey) {
            return { devices: [], error: 'La configuración de P. GPS no está completa.' };
        }

        const numericId = clientWoxId.replace('wox-', '');
        const apiUrl = new URL(`/api/admin/client/${numericId}/devices`, settings.url);
        apiUrl.searchParams.append('user_api_hash', settings.apiKey);
        
        const response = await fetch(apiUrl.toString());

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Error fetching devices from P. GPS API (${apiUrl}): ${response.status} ${response.statusText}`, errorBody);
            return { devices: [], error: `Error de la API de P. GPS: ${response.statusText}` };
        }

        const jsonResponse: WoxDeviceListForClientApiResponse = await response.json();
        const devices = jsonResponse.data || [];

        return { devices: devices };

    } catch (error) {
        console.error(`Failed to get P. GPS devices for client ${clientWoxId}:`, error);
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return { devices: [], error: message };
    }
}

export async function getWoxDeviceDetails(deviceId: string): Promise<{ device: WoxDevice | null; error?: string }> {
    try {
        const settings = await getWoxSettings();
        if (!settings?.url || !settings?.apiKey) {
            return { device: null, error: 'P. GPS settings are not configured.' };
        }

        const apiUrl = new URL(`/api/admin/device/${deviceId}`, settings.url);
        apiUrl.searchParams.append('user_api_hash', settings.apiKey);

        const response = await fetch(apiUrl.toString());
        if (!response.ok) {
             console.error(`Error fetching device ${deviceId} from P. GPS API: ${response.status} ${response.statusText}`);
            return { device: null, error: `Error de la API de P. GPS: ${response.statusText}` };
        }
        
        const jsonResponse: WoxDeviceDetailApiResponse = await response.json();
        
        return { device: jsonResponse.data || null };

    } catch (error) {
        console.error(`Failed to get P. GPS device details for id ${deviceId}:`, error);
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return { device: null, error: message };
    }
}


export async function setWoxDeviceStatus(
  deviceId: string,
  active: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const settings = await getWoxSettings();
    if (!settings?.url || !settings?.apiKey) {
      return { success: false, message: 'La configuración de P. GPS no está completa.' };
    }

    const apiUrl = new URL(`/api/admin/device/${deviceId}/status`, settings.url);
    apiUrl.searchParams.append('user_api_hash', settings.apiKey);
    
    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        active: active ? 1 : 0
      }),
    });
    
    if (!response.ok) {
        const errorBody = await response.json();
        const errorMessage = errorBody?.errors?.[0]?.message || response.statusText;
        console.error(`Error setting device status in P. GPS API: ${response.status} ${errorMessage}`, errorBody);
        return { success: false, message: `Error de la API de P. GPS: ${errorMessage}` };
    }

    const jsonResponse = await response.json();
    if (jsonResponse.status !== 1) {
        return { success: false, message: 'La API de P. GPS indicó un error al cambiar el estado.' };
    }

    return { success: true, message: 'El estado del dispositivo se actualizó con éxito en P. GPS.' };

  } catch (error) {
    console.error(`Failed to set P. GPS device status for device ${deviceId}:`, error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message };
  }
}
