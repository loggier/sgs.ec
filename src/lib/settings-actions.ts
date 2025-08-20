
'use server';

import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
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
    
    const dataToSave = { ...validation.data, ownerId: user.id };
    
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


async function copyGlobalTemplatesForUser(userId: string): Promise<MessageTemplate[]> {
    const globalTemplatesQuery = query(collection(db, TEMPLATES_COLLECTION), where('isGlobal', '==', true));
    const globalSnapshot = await getDocs(globalTemplatesQuery);

    if (globalSnapshot.empty) {
        console.log("No global templates found to copy.");
        return [];
    }

    const batch = writeBatch(db);
    const newTemplates: MessageTemplate[] = [];

    globalSnapshot.forEach(doc => {
        const globalTemplate = doc.data() as Omit<MessageTemplate, 'id'>;
        const newTemplateData = {
            ...globalTemplate,
            ownerId: userId,
            isGlobal: false, // It's a personal copy now
        };
        const newTemplateRef = doc(collection(db, TEMPLATES_COLLECTION));
        batch.set(newTemplateRef, newTemplateData);
        newTemplates.push({ id: newTemplateRef.id, ...newTemplateData });
    });

    await batch.commit();
    console.log(`Copied ${newTemplates.length} global templates to user ${userId}`);
    return newTemplates;
}


export async function getMessageTemplatesForUser(userId: string): Promise<MessageTemplate[]> {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) return [];
        const user = userDoc.data() as User;
        
        const ownerId = (user.role === 'analista' && user.creatorId) ? user.creatorId : userId;
        
        const personalTemplatesQuery = query(
            collection(db, TEMPLATES_COLLECTION),
            where('ownerId', '==', ownerId)
        );
        
        let personalSnapshot = await getDocs(personalTemplatesQuery);

        // If a master/manager has no templates, copy the global ones for them.
        if (personalSnapshot.empty && ['master', 'manager'].includes(user.role)) {
            const copiedTemplates = await copyGlobalTemplatesForUser(userId);
            // If templates were copied, we return them directly
            if (copiedTemplates.length > 0) {
                 personalSnapshot = await getDocs(personalTemplatesQuery);
            }
        }
        
        const globalTemplatesQuery = query(collection(db, TEMPLATES_COLLECTION), where('isGlobal', '==', true));
        const globalSnapshot = await getDocs(globalTemplatesQuery);
        
        const templatesMap = new Map<TemplateEventType, MessageTemplate>();
        
        // Add global templates first (they will be the default)
        globalSnapshot.docs.forEach(doc => {
            const template = { id: doc.id, ...doc.data() } as MessageTemplate;
            templatesMap.set(template.eventType, template);
        });

        // Override with personal templates if they exist for the same eventType
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


export async function getMessageTemplates(ownerId?: string): Promise<MessageTemplate[]> {
    try {
        const templatesCollectionRef = collection(db, TEMPLATES_COLLECTION);
        const q = ownerId 
            ? query(templatesCollectionRef, where('ownerId', '==', ownerId))
            : query(templatesCollectionRef, where('ownerId', '==', null)); // Global templates
            
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTemplate));
    } catch (error) {
        console.error("Error getting message templates:", error);
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
        
        if (!templateDoc.exists() || templateDoc.data().ownerId !== user.id) {
            return { success: false, message: 'No tiene permiso para eliminar esta plantilla o no existe.' };
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
