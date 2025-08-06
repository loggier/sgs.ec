
'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { WoxSettingsSchema, type WoxSettings, QyvooSettingsSchema, type QyvooSettings } from './settings-schema';

const SETTINGS_DOC_ID = 'integrations';

// --- WOX Settings ---

export async function saveWoxSettings(
  data: WoxSettings
): Promise<{ success: boolean; message: string }> {
  try {
    // Permission check is now handled on the client-side component
    // before this server action is called.
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
    // Permission check is done on the component calling this function
    const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.wox ? (data.wox as WoxSettings) : null;
    }
    return null;
  } catch (error) {
     console.error("Error getting WOX settings:", error);
     if (error instanceof Error) {
        throw error;
     }
     throw new Error("Un error desconocido ocurrió al obtener la configuración.");
  }
}

// --- Qyvoo Settings ---

export async function saveQyvooSettings(
  data: QyvooSettings
): Promise<{ success: boolean; message: string }> {
  try {
    const validation = QyvooSettingsSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, message: 'Datos no válidos.' };
    }

    const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);
    await setDoc(settingsDocRef, { qyvoo: validation.data }, { merge: true });

    return { success: true, message: 'Configuración de Qyvoo guardada con éxito.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    console.error("Error saving Qyvoo settings:", message);
    return { success: false, message };
  }
}

export async function getQyvooSettings(): Promise<QyvooSettings | null> {
  try {
    const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.qyvoo ? (data.qyvoo as QyvooSettings) : null;
    }
    return null;
  } catch (error) {
    console.error("Error getting Qyvoo settings:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Un error desconocido ocurrió al obtener la configuración de Qyvoo.");
  }
}
