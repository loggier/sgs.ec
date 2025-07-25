
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { WoxSettingsSchema, type WoxSettings } from './settings-schema';
import { getCurrentUser } from './auth';

const SETTINGS_DOC_ID = 'integrations';

// Helper function to check for master role
async function verifyMasterRole() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'master') {
        throw new Error('Acción no permitida. Se requiere rol de Master.');
    }
    return user;
}


// --- WOX Settings ---

export async function saveWoxSettings(
  data: WoxSettings
): Promise<{ success: boolean; message: string }> {
  try {
    await verifyMasterRole();

    const validation = WoxSettingsSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, message: 'Datos no válidos.' };
    }

    const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);
    await setDoc(settingsDocRef, { wox: validation.data }, { merge: true });

    return { success: true, message: 'Configuración de WOX guardada con éxito.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    console.error("Error saving WOX settings:", message);
    return { success: false, message };
  }
}

export async function getWoxSettings(): Promise<WoxSettings | null> {
  try {
    await verifyMasterRole();
    const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.wox ? (data.wox as WoxSettings) : null;
    }
    return null;
  } catch (error) {
    console.error("Error getting WOX settings:", error);
    return null;
  }
}
