
'use server';

import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, query, where, writeBatch, limit } from 'firebase/firestore';
import { db } from './firebase';
import { revalidatePath } from 'next/cache';
import { WoxSettingsSchema, type WoxSettings, QyvooSettingsSchema, type QyvooSettings, MessageTemplateSchema, type MessageTemplate, type MessageTemplateFormInput, TemplateEventType } from './settings-schema';
import type { User } from './user-schema';

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
  userId: string,
  data: QyvooSettings
): Promise<{ success: boolean; message: string; user?: User; }> {
  try {
    const validation = QyvooSettingsSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, message: 'Datos no válidos.' };
    }

    const userDocRef = doc(db, 'users', userId);
    const userDataToUpdate = {
        qyvooApiKey: validation.data.apiKey,
        qyvooUserId: validation.data.userId,
    };
    await updateDoc(userDocRef, userDataToUpdate);
    
    const updatedUserDoc = await getDoc(userDocRef);
    if (!updatedUserDoc.exists()) {
        throw new Error("El usuario no fue encontrado después de la actualización.");
    }
    
    const { password, ...user } = { id: updatedUserDoc.id, ...updatedUserDoc.data() } as User;

    return { success: true, message: 'Configuración de Qyvoo guardada con éxito en su perfil.', user: user };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    console.error("Error saving Qyvoo settings:", message);
    return { success: false, message };
  }
}

export async function getQyvooSettingsForUser(userId: string): Promise<QyvooSettings | null> {
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return null;
        }
        const userData = userDoc.data() as User;
        
        // If the user is an analyst, get settings from their manager/creator
        if (userData.role === 'analista' && userData.creatorId) {
            return getQyvooSettingsForUser(userData.creatorId);
        }
        
        // For master/manager, get their own settings
        if (userData.qyvooApiKey && userData.qyvooUserId) {
            return {
                apiKey: userData.qyvooApiKey,
                userId: userData.qyvooUserId
            };
        }

        return null;
    } catch(error) {
        console.error("Error getting Qyvoo settings for user:", error);
        return null;
    }
}


// --- Message Template Actions ---

async function ensureGlobalTemplatesExist() {
    const templatesCollectionRef = collection(db, TEMPLATES_COLLECTION);
    const globalTemplatesQuery = query(templatesCollectionRef, where('isGlobal', '==', true), limit(1));
    const globalSnapshot = await getDocs(globalTemplatesQuery);

    if (globalSnapshot.empty) {
        console.log("No global templates found. Creating defaults...");

        const batch = writeBatch(db);
        const defaultTemplates: Omit<MessageTemplate, 'id'>[] = [
            { name: 'Recordatorio de Pago (Global)', eventType: 'payment_reminder', content: 'Estimado/a {nombre_cliente}, le recordamos que su pago está próximo a vencer.\n\n{resumen_unidades}\n\nPara evitar la suspensión del servicio, por favor realice su pago. Gracias, {nombre_empresa}.', isGlobal: true },
            { name: 'Vencimiento Hoy (Global)', eventType: 'payment_due_today', content: 'Estimado/a {nombre_cliente}, su servicio vence el día de hoy.\n\n{resumen_unidades}\n\nRealice su pago para mantener su servicio activo. Atentamente, {nombre_empresa}.', isGlobal: true },
            { name: 'Pago Vencido (Global)', eventType: 'payment_overdue', content: 'Estimado/a {nombre_cliente}, su pago se encuentra vencido.\n\n{resumen_unidades}\n\nSu servicio será suspendido. Comuníquese con {nombre_empresa} para regularizar su situación.', isGlobal: true },
            { name: 'Pago Recibido (Global)', eventType: 'payment_received', content: 'Estimado/a {nombre_cliente}, hemos recibido su pago. ¡Gracias por su confianza!\n\n{resumen_unidades}\n\nAtentamente, {nombre_empresa}.', isGlobal: true },
            { name: 'Servicio Suspendido (Global)', eventType: 'service_suspended', content: 'Estimado/a {nombre_cliente}, le informamos que su servicio ha sido suspendido por falta de pago.\n\n{resumen_unidades}\n\nPara reactivarlo, por favor póngase en contacto con {nombre_empresa}.', isGlobal: true },
            { name: 'Servicio Reactivado (Global)', eventType: 'service_reactivated', content: 'Estimado/a {nombre_cliente}, le informamos que su servicio ha sido reactivado con éxito.\n\n{resumen_unidades}\n\nGracias por su pago. Atentamente, {nombre_empresa}.', isGlobal: true },
        ];
        
        defaultTemplates.forEach(template => {
            const docRef = doc(collection(db, TEMPLATES_COLLECTION));
            batch.set(docRef, template);
        });
        
        await batch.commit();
        console.log("Default global templates created.");
    }
}


export async function saveMessageTemplate(
  data: MessageTemplateFormInput,
  user: User,
  templateId?: string
): Promise<{ success: boolean; message: string; template?: MessageTemplate }> {
    if (!['master', 'manager'].includes(user.role)) {
        return { success: false, message: 'No tiene permiso para guardar plantillas.' };
    }
    
    const validation = MessageTemplateSchema.omit({id: true, isGlobal: true}).safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Datos de plantilla no válidos.' };
    }
    
    const dataToSave = { ...validation.data, ownerId: user.id, isGlobal: false };
    
    try {
        if (templateId) {
            const templateDocRef = doc(db, TEMPLATES_COLLECTION, templateId);
            await setDoc(templateDocRef, dataToSave, { merge: true });
            revalidatePath('/settings/templates');
            return { success: true, message: 'Plantilla actualizada con éxito.', template: { id: templateId, ...dataToSave } };
        } else {
            const templateCollectionRef = collection(db, TEMPLATES_COLLECTION);
            const newDocRef = await addDoc(templateCollectionRef, dataToSave);
            revalidatePath('/settings/templates');
            return { success: true, message: 'Plantilla creada con éxito.', template: { id: newDocRef.id, ...dataToSave } };
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
        console.error("Error saving message template:", message);
        return { success: false, message };
    }
}


async function copyGlobalTemplatesForUser(userId: string) {
    await ensureGlobalTemplatesExist();

    const templatesCollectionRef = collection(db, TEMPLATES_COLLECTION);
    const globalTemplatesQuery = query(templatesCollectionRef, where('isGlobal', '==', true));
    const globalSnapshot = await getDocs(globalTemplatesQuery);

    if (globalSnapshot.empty) {
        console.error("Failed to create or find global templates to copy.");
        return;
    }

    const batch = writeBatch(db);
    globalSnapshot.forEach(globalDoc => {
        const globalTemplateData = globalDoc.data() as Omit<MessageTemplate, 'id'>;
        const newTemplateRef = doc(templatesCollectionRef); // Create a new doc reference for the personal copy
        const newTemplateData: Omit<MessageTemplate, 'id'> = {
            ...globalTemplateData,
            ownerId: userId, // Assign the correct owner
            isGlobal: false,   // It's a personal copy, not a global one
        };
        batch.set(newTemplateRef, newTemplateData);
    });

    await batch.commit();
    console.log(`Copied ${globalSnapshot.size} global templates for user ${userId}.`);
}


export async function getMessageTemplatesForUser(userId: string): Promise<MessageTemplate[]> {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) return [];
        const user = userDoc.data() as User;
        
        const ownerId = (user.role === 'analista' && user.creatorId) ? user.creatorId : userId;
        
        const templatesCollectionRef = collection(db, TEMPLATES_COLLECTION);
        const personalTemplatesQuery = query(templatesCollectionRef, where('ownerId', '==', ownerId));
        let personalSnapshot = await getDocs(personalTemplatesQuery);

        // If the user is a manager/master and has no templates, create them.
        if (personalSnapshot.empty && ['master', 'manager'].includes(user.role)) {
            await copyGlobalTemplatesForUser(ownerId);
            // Re-fetch the personal templates after they've been created.
            personalSnapshot = await getDocs(personalTemplatesQuery);
        }
        
        const globalTemplatesQuery = query(templatesCollectionRef, where('isGlobal', '==', true));
        const globalSnapshot = await getDocs(globalTemplatesQuery);
        
        const templatesMap = new Map<TemplateEventType, MessageTemplate>();
        
        // Load global templates first as a base
        globalSnapshot.docs.forEach(doc => {
            const template = { id: doc.id, ...doc.data() } as MessageTemplate;
            templatesMap.set(template.eventType, template);
        });

        // Overwrite with personal templates if they exist
        personalSnapshot.docs.forEach(doc => {
            const template = { id: doc.id, ...doc.data() } as MessageTemplate;
            templatesMap.set(template.eventType, template);
        });
        
        return Array.from(templatesMap.values());

    } catch (error) {
        console.error("Error getting message templates for user:", error);
        return [];
    }
}

export async function deleteMessageTemplate(templateId: string, user: User): Promise<{ success: boolean; message: string }> {
    if (!['master', 'manager'].includes(user.role)) {
        return { success: false, message: 'No tiene permiso para eliminar plantillas.' };
    }
    
    try {
        const templateDocRef = doc(db, TEMPLATES_COLLECTION, templateId);
        const templateDoc = await getDoc(templateDocRef);
        
        if (!templateDoc.exists()) {
             return { success: false, message: 'La plantilla no existe.' };
        }
        
        const templateData = templateDoc.data();
        if (templateData.isGlobal === true) {
            return { success: false, message: 'No se pueden eliminar las plantillas globales.' };
        }

        if (templateData.ownerId !== user.id) {
            return { success: false, message: 'No tiene permiso para eliminar esta plantilla.' };
        }
        
        await deleteDoc(templateDocRef);
        revalidatePath('/settings/templates');
        return { success: true, message: 'Plantilla eliminada con éxito.' };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
        console.error("Error deleting message template:", message);
        return { success: false, message };
    }
}
