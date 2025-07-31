
'use server';

import { getWoxSettings } from './settings-actions';
import type { ClientDisplay } from './schema';

type WoxClient = {
    id: number;
    group_id: number;
    email: string;
    phone_number: string;
    loged_at: string;
    manager?: {
        email: string;
    };
};

type WoxApiResponse = {
    data: WoxClient[];
};

function mapWoxToDisplay(woxClient: WoxClient): Partial<ClientDisplay> {
    return {
        id: `wox-${woxClient.id}`, // This is a temporary ID for lookups, not the stored ID
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
    
    const jsonResponse: WoxApiResponse = await response.json();
    
    // We don't filter by group_id here anymore, we return all clients for potential linking
    const mappedClients = jsonResponse.data.map(mapWoxToDisplay);
    
    return { clients: mappedClients };

  } catch (error) {
    console.error("Failed to get WOX clients:", error);
    return { clients: [], error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}
