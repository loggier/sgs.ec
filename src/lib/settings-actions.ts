

'use server';

import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, query, where, writeBatch, limit } from 'firebase/firestore';
import { db } from './firebase';
import { revalidatePath } from 'next/cache';
import { WoxSettingsSchema, type WoxSettings, NotificationSettingsSchema, type NotificationSettings, MessageTemplateSchema, type MessageTemplate, type MessageTemplateFormInput, TemplateEventType } from './settings-schema';
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

// --- Notification URL Settings ---

export async function saveNotificationUrl(
  userId: string,
  data: NotificationSettings
): Promise<{ success: boolean; message: string; user?: User; }> {
  try {
    const validation = NotificationSettingsSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, message: 'Datos no válidos.' };
    }

    const userDocRef = doc(db, 'users', userId);
    const userDataToUpdate = {
        notificationUrl: validation.data.notificationUrl,
    };
    await updateDoc(userDocRef, userDataToUpdate);
    
    const updatedUserDoc = await getDoc(userDocRef);
    if (!updatedUserDoc.exists()) {
        throw new Error("El usuario no fue encontrado después de la actualización.");
    }
    
    const { password, ...user } = { id: updatedUserDoc.id, ...updatedUserDoc.data() } as User;

    return { success: true, message: 'URL de Notificaciones guardada con éxito en su perfil.', user: user };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    console.error("Error saving Notification URL:", message);
    return { success: false, message };
  }
}

export async function getNotificationUrlForUser(userId: string): Promise<NotificationSettings | null> {
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return null;
        }
        const userData = userDoc.data() as User;
        
        // If the user is an analyst or technician, get settings from their manager/creator
        if ((userData.role === 'analista' || userData.role === 'tecnico') && userData.creatorId) {
            return getNotificationUrlForUser(userData.creatorId);
        }
        
        // For master/manager, get their own settings
        if (userData.notificationUrl) {
            return {
                notificationUrl: userData.notificationUrl,
            };
        }

        return null;
    } catch(error) {
        console.error("Error getting Notification URL for user:", error);
        return null;
    }
}


// --- Message Template Actions ---

async function ensureGlobalTemplatesExist() {
    const templatesCollectionRef = collection(db, TEMPLATES_COLLECTION);
    const globalTemplatesQuery = query(templatesCollectionRef, where('isGlobal', '==', true), limit(1));
    const globalSnapshot = await getDocs(globalTemplatesQuery);

    if (globalSnapshot.empty) {
        console.log("No global templates found. Creating defaults in DB...");

        const batch = writeBatch(db);
        const defaultTemplates: Omit<MessageTemplate, 'id'>[] = [
            { name: 'Recordatorio de Pago (Global)', eventType: 'payment_reminder', content: 'Estimado/a {nombre_cliente}, le recordamos que su pago está próximo a vencer.\n\n{resumen_unidades}\n\nPara evitar la suspensión del servicio, por favor realice su pago. Gracias, {nombre_empresa}.', isGlobal: true, isActive: true },
            { name: 'Vencimiento Hoy (Global)', eventType: 'payment_due_today', content: 'Estimado/a {nombre_cliente}, su servicio vence el día de hoy.\n\n{resumen_unidades}\n\nRealice su pago para mantener su servicio activo. Atentamente, {nombre_empresa}.', isGlobal: true, isActive: true },
            { name: 'Pago Vencido (Global)', eventType: 'payment_overdue', content: 'Estimado/a {nombre_cliente}, su pago se encuentra vencido.\n\n{resumen_unidades}\n\nSu servicio será suspendido. Comuníquese con {nombre_empresa} para regularizar su situación.', isGlobal: true, isActive: true },
            { name: 'Pago Recibido (Global)', eventType: 'payment_received', content: 'Estimado/a {nombre_cliente}, hemos recibido su pago. ¡Gracias por su confianza!\n\n{resumen_unidades}\n\nAtentamente, {nombre_empresa}.', isGlobal: true, isActive: true },
            { name: 'Servicio Suspendido (Global)', eventType: 'service_suspended', content: 'Estimado/a {nombre_cliente}, le informamos que su servicio ha sido suspendido por falta de pago.\n\n{resumen_unidades}\n\nPara reactivarlo, por favor póngase en contacto con {nombre_empresa}.', isGlobal: true, isActive: true },
            { name: 'Servicio Reactivado (Global)', eventType: 'service_reactivated', content: 'Estimado/a {nombre_cliente}, le informamos que su servicio ha sido reactivado con éxito.\n\n{resumen_unidades}\n\nGracias por su pago. Atentamente, {nombre_empresa}.', isGlobal: true, isActive: true },
        ];
        
        defaultTemplates.forEach(template => {
            const docRef = doc(collection(db, TEMPLATES_COLLECTION));
            batch.set(docRef, template);
        });
        
        await batch.commit();
        console.log("Default global templates created in Firestore.");
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
    
    const validation = MessageTemplateSchema.omit({id: true}).safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Datos de plantilla no válidos.' };
    }
    
    const dataToSave = { ...validation.data };
    
    try {
        if (templateId) {
            const templateDocRef = doc(db, TEMPLATES_COLLECTION, templateId);
            const templateDoc = await getDoc(templateDocRef);
            
            if (!templateDoc.exists()) {
                return { success: false, message: 'La plantilla que intenta editar no existe.' };
            }
            const existingTemplate = templateDoc.data() as MessageTemplate;

            // Permission check: only masters can edit global templates
            if (existingTemplate.isGlobal && user.role !== 'master') {
                 return { success: false, message: 'No tiene permiso para editar una plantilla global.' };
            }
            
            // Personal templates can only be edited by their owners.
            if (!existingTemplate.isGlobal && existingTemplate.ownerId !== user.id) {
                return { success: false, message: 'No tiene permiso para editar esta plantilla.' };
            }

            await setDoc(templateDocRef, dataToSave, { merge: true });
            revalidatePath('/settings/templates');
            revalidatePath('/settings/templates/global');
            return { success: true, message: 'Plantilla actualizada con éxito.', template: { id: templateId, ...dataToSave } };
        } else {
             // For new templates, assign owner and set isGlobal to false.
            const newData = { ...dataToSave, ownerId: user.id, isGlobal: false, isActive: data.isActive ?? true };
            const templateCollectionRef = collection(db, TEMPLATES_COLLECTION);
            const newDocRef = await addDoc(templateCollectionRef, newData);
            revalidatePath('/settings/templates');
            return { success: true, message: 'Plantilla creada con éxito.', template: { id: newDocRef.id, ...newData } };
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
            isActive: globalTemplateData.isActive ?? true,
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
        
        // Ensure global templates exist in the DB for everyone.
        await ensureGlobalTemplatesExist();
        
        // For managers/masters, ensure they have a personal copy of the templates.
        if (['master', 'manager'].includes(user.role)) {
            const personalTemplatesQuery = query(templatesCollectionRef, where('ownerId', '==', ownerId));
            const personalSnapshot = await getDocs(personalTemplatesQuery);
            if (personalSnapshot.empty) {
                await copyGlobalTemplatesForUser(ownerId);
            }
        }
        
        // Everyone gets to see the global templates and their own personal templates (or their manager's).
        const personalTemplatesQuery = query(templatesCollectionRef, where('ownerId', '==', ownerId));
        const globalTemplatesQuery = query(templatesCollectionRef, where('isGlobal', '==', true));

        const [personalSnapshot, globalSnapshot] = await Promise.all([
            getDocs(personalTemplatesQuery),
            getDocs(globalTemplatesQuery)
        ]);

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

export async function getGlobalMessageTemplates(): Promise<MessageTemplate[]> {
    try {
        await ensureGlobalTemplatesExist();
        const templatesCollectionRef = collection(db, TEMPLATES_COLLECTION);
        const q = query(templatesCollectionRef, where('isGlobal', '==', true));
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTemplate));
    } catch(error) {
        console.error("Error fetching global message templates:", error);
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
