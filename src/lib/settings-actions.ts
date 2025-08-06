
'use server';

import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { revalidatePath } from 'next/cache';
import { WoxSettingsSchema, type WoxSettings, QyvooSettingsSchema, type QyvooSettings, MessageTemplateSchema, type MessageTemplate, type MessageTemplateFormInput } from './settings-schema';

const SETTINGS_DOC_ID = 'integrations';
const TEMPLATES_COLLECTION = 'message_templates';


// --- P. GPS Settings ---

export async function savePgpsSettings(
  data: WoxSettings
): Promise<{ success: boolean; message: string }> {
  try {
    const validation = WoxSettingsSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, message: 'Datos no válidos.' };
    }

    const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);
    await setDoc(settingsDocRef, { wox: validation.data }, { merge: true });

    return { success: true, message: 'Configuración de P. GPS guardada con éxito.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    console.error("Error saving P. GPS settings:", message);
    return { success: false, message };
  }
}

export async function getPgpsSettings(): Promise<WoxSettings | null> {
  try {
    const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.wox ? (data.wox as WoxSettings) : null;
    }
    return null;
  } catch (error) {
     console.error("Error getting P. GPS settings:", error);
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

// --- Message Template Actions ---

export async function saveMessageTemplate(
  data: MessageTemplateFormInput,
  templateId?: string
): Promise<{ success: boolean; message: string; template?: MessageTemplate }> {
    const validation = MessageTemplateSchema.omit({id: true}).safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Datos de plantilla no válidos.' };
    }
    try {
        if (templateId) {
            const templateDocRef = doc(db, TEMPLATES_COLLECTION, templateId);
            await setDoc(templateDocRef, validation.data, { merge: true });
            revalidatePath('/settings/templates');
            return { success: true, message: 'Plantilla actualizada con éxito.', template: { id: templateId, ...validation.data } };
        } else {
            const templateCollectionRef = collection(db, TEMPLATES_COLLECTION);
            const newDocRef = await addDoc(templateCollectionRef, validation.data);
            revalidatePath('/settings/templates');
            return { success: true, message: 'Plantilla creada con éxito.', template: { id: newDocRef.id, ...validation.data } };
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
        console.error("Error saving message template:", message);
        return { success: false, message };
    }
}

export async function getMessageTemplates(): Promise<MessageTemplate[]> {
    try {
        const templatesCollectionRef = collection(db, TEMPLATES_COLLECTION);
        const snapshot = await getDocs(templatesCollectionRef);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTemplate));
    } catch (error) {
        console.error("Error getting message templates:", error);
        return [];
    }
}

export async function deleteMessageTemplate(templateId: string): Promise<{ success: boolean; message: string }> {
    try {
        const templateDocRef = doc(db, TEMPLATES_COLLECTION, templateId);
        await deleteDoc(templateDocRef);
        revalidatePath('/settings/templates');
        return { success: true, message: 'Plantilla eliminada con éxito.' };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
        console.error("Error deleting message template:", message);
        return { success: false, message };
    }
}
