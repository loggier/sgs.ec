'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { clients } from './data';
import { ClientSchema, type Client } from './schema';
import { assessCreditRisk, type AssessCreditRiskOutput } from '@/ai/flows/credit-risk-assessment';

// This is a mock database implementation.
// In a real application, you would use a database like Firestore, PostgreSQL, etc.

export async function getClients(): Promise<Client[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return clients;
}

export async function getClientById(id: string): Promise<Client | undefined> {
  return clients.find(c => c.id === id);
}

export async function saveClient(
  data: Omit<Client, 'id'>,
  id?: string
): Promise<{ success: boolean; message: string; client?: Client; assessment?: AssessCreditRiskOutput }> {
  const validation = ClientSchema.omit({ id: true }).safeParse(data);

  if (!validation.success) {
    return { success: false, message: 'Invalid data provided.' };
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
        return { success: false, message: 'Client not found.' };
      }
    } else {
      // Create new client
      id = (clients.length + 1).toString() + Date.now();
      const newClient = { id, ...clientData };
      clients.push(newClient);

      // Perform AI credit risk assessment for new clients
      assessmentResult = await assessCreditRisk({
        ...clientData,
        fecConcesion: clientData.fecConcesion.toISOString().split('T')[0],
        fecVencimiento: clientData.fecVencimiento.toISOString().split('T')[0],
      });
    }

    revalidatePath('/');
    return {
      success: true,
      message: `Client ${id ? 'updated' : 'created'} successfully.`,
      client: await getClientById(id),
      assessment: assessmentResult,
    };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to save client: ${errorMessage}` };
  }
}

export async function deleteClient(id: string): Promise<{ success: boolean; message: string }> {
  const clientIndex = clients.findIndex(c => c.id === id);
  if (clientIndex > -1) {
    clients.splice(clientIndex, 1);
    revalidatePath('/');
    return { success: true, message: 'Client deleted successfully.' };
  }
  return { success: false, message: 'Client not found.' };
}
