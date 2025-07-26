
'use server';

import { getWoxSettings } from './settings-actions';
import type { ClientDisplay, WoxClientData } from './schema';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUser } from './user-actions';

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

function mapWoxToDisplay(woxClient: WoxClient): ClientDisplay {
    return {
        id: `wox-${woxClient.id}`,
        source: 'wox',
        nomSujeto: woxClient.email, // Default name, can be overridden
        correo: woxClient.email,     // The non-editable WOX email
        codIdSujeto: woxClient.email,
        telefono: woxClient.phone_number,
        managerEmail: woxClient.manager?.email,
        // Default state for a WOX client before it's enriched
        estado: 'al dia',
        // Other fields will be merged from the local enrichment data
    };
}

export async function getWoxClients(): Promise<{ clients: ClientDisplay[]; error?: string }> {
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
    
    const mappedClients = jsonResponse.data
      .filter(client => client.group_id === 2)
      .map(mapWoxToDisplay);
    
    return { clients: mappedClients };

  } catch (error) {
    console.error("Failed to get WOX clients:", error);
    return { clients: [], error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

export async function getWoxClientData(): Promise<Map<string, WoxClientData>> {
    const dataMap = new Map<string, WoxClientData>();
    const snapshot = await getDocs(collection(db, 'woxClientData'));
    snapshot.forEach(doc => {
        dataMap.set(doc.id, doc.data() as WoxClientData);
    });
    return dataMap;
}

export async function saveWoxClientData(
  woxClientId: string,
  data: Partial<WoxClientData>
): Promise<{ success: boolean; message: string; client?: WoxClientData }> {
  const user = await getCurrentUser();
  if (!user || !['master', 'manager'].includes(user.role)) {
    return { success: false, message: 'Acción no permitida.' };
  }

  try {
    const dataToSave = { ...data, ownerId: user.id };
    const docRef = doc(db, 'woxClientData', woxClientId);
    await setDoc(docRef, dataToSave, { merge: true });

    const savedDoc = await getDoc(docRef);
    const savedData = savedDoc.data() as WoxClientData;

    return { success: true, message: 'Datos adicionales guardados.', client: savedData };
  } catch (error) {
    console.error("Error saving WOX client data:", error);
    return { success: false, message: 'No se pudieron guardar los datos adicionales.' };
  }
}
