'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { clients } from './data';
import { ClientSchema, type Client } from './schema';
import { assessCreditRisk, type AssessCreditRiskOutput } from '@/ai/flows/credit-risk-assessment';

// This is a mock database implementation.
// In a real application, you would use a database like Firestore, PostgreSQL, etc.

export async function getClients(): Promise<Omit<Client, 'placaVehiculo'>[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return clients;
}

export async function getClientById(id: string): Promise<Omit<Client, 'placaVehiculo'> | undefined> {
  return clients.find(c => c.id === id);
}

export async function saveClient(
  data: Omit<Client, 'id'>,
  id?: string
): Promise<{ success: boolean; message: string; client?: Omit<Client, 'placaVehiculo'>; assessment?: AssessCreditRiskOutput }> {
  const validation = ClientSchema.omit({ id: true }).safeParse(data);

  if (!validation.success) {
    return { success: false, message: 'Datos proporcionados no válidos.' };
  }

  const { ...clientData } = validation.data;

  let assessmentResult: AssessCreditRiskOutput | undefined;

  try {
    if (id) {
      // Update existing client
      const clientIndex = clients.findIndex(c => c.id === id);
      if (clientIndex > -1) {
        clients[clientIndex] = { ...clients[clientIndex], ...clientData };
      } else {
        return { success: false, message: 'Cliente no encontrado.' };
      }
    } else {
      // Create new client
      const newId = (clients.length + 1).toString() + Date.now();
      const newClient = { id: newId, ...clientData };
      clients.push(newClient);

      // Perform AI credit risk assessment for new clients
      assessmentResult = await assessCreditRisk({
        ...clientData,
        fecConcesion: clientData.fecConcesion.toISOString().split('T')[0],
        fecVencimiento: clientData.fecVencimiento.toISOString().split('T')[0],
      });
      id = newId;
    }

    revalidatePath('/');
    const savedClient = await getClientById(id);
    return {
      success: true,
      message: `Cliente ${id ? 'actualizado' : 'creado'} con éxito.`,
      client: savedClient,
      assessment: assessmentResult,
    };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, message: `Error al guardar el cliente: ${errorMessage}` };
  }
}

export async function deleteClient(id: string): Promise<{ success: boolean; message: string }> {
  const clientIndex = clients.findIndex(c => c.id === id);
  if (clientIndex > -1) {
    clients.splice(clientIndex, 1);
    revalidatePath('/');
    return { success: true, message: 'Cliente eliminado con éxito.' };
  }
  return { success: false, message: 'Cliente no encontrado.' };
}