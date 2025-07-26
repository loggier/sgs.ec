
'use server';

import { getWoxSettings } from './settings-actions';
import type { ClientWithOwner } from './schema';

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
    // We don't need pagination for this implementation
};

function mapWoxToInternal(woxClient: WoxClient): ClientWithOwner {
    // This is a loose mapping. We fill what we can.
    return {
        id: `wox-${woxClient.id}`, // Prefix to avoid ID collisions
        source: 'wox',
        nomSujeto: woxClient.email,
        codIdSujeto: woxClient.email, // Use email as an identifier
        telefono: woxClient.phone_number,
        managerEmail: woxClient.manager?.email,
        fecVencimiento: new Date(woxClient.loged_at), // Using loged_at as a proxy for some date field
        estado: 'al dia', // WOX clients don't have our status system
        // The rest of the fields are not available from the WOX API
        ownerId: '', // WOX clients don't have an internal owner
        codTipoId: 'C',
        direccion: 'No disponible desde WOX',
    };
}

export async function getWoxClients(): Promise<{ clients: ClientWithOwner[]; error?: string }> {
  try {
    const settings = await getWoxSettings();

    if (!settings?.url || !settings?.apiKey) {
      // If not configured, just return an empty array, not an error.
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
    
    const mappedClients = jsonResponse.data
      .filter(client => client.group_id === 2) // Filter by group_id
      .map(mapWoxToInternal);
    
    return { clients: mappedClients };

  } catch (error) {
    console.error("Failed to get WOX clients:", error);
    return { clients: [], error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}
