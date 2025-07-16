'use server';

import { revalidatePath } from 'next/cache';
import { units } from './unit-data';
import { UnitFormSchema, type Unit, type UnitFormInput } from './unit-schema';

export async function getUnitsByClientId(clientId: string): Promise<Unit[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return units.filter(u => u.clientId === clientId);
}

export async function saveUnit(
  data: UnitFormInput,
  clientId: string,
  unitId?: string
): Promise<{ success: boolean; message: string; unit?: Unit }> {
  const validation = UnitFormSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, message: 'Datos de unidad no válidos.' };
  }
  
  try {
    if (unitId) {
      // Update
      const unitIndex = units.findIndex(u => u.id === unitId && u.clientId === clientId);
      if (unitIndex === -1) {
        return { success: false, message: 'Unidad no encontrada.' };
      }
      // Preserve read-only fields
      const updatedUnit = { 
        ...units[unitIndex], 
        ...validation.data,
        ultimoPago: units[unitIndex].ultimoPago,
        fechaSiguientePago: units[unitIndex].fechaSiguientePago,
      };
      units[unitIndex] = updatedUnit;
      revalidatePath(`/clients/${clientId}/units`);
      return { success: true, message: 'Unidad actualizada con éxito.', unit: updatedUnit };

    } else {
      // Create
      const newUnit: Unit = {
        id: `unit-${Date.now()}`,
        clientId,
        ...validation.data
      };
      units.push(newUnit);
      revalidatePath(`/clients/${clientId}/units`);
      return { success: true, message: 'Unidad creada con éxito.', unit: newUnit };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message: `Error al guardar la unidad: ${errorMessage}` };
  }
}

export async function deleteUnit(unitId: string, clientId: string): Promise<{ success: boolean; message: string }> {
    const unitIndex = units.findIndex(u => u.id === unitId);
    if (unitIndex === -1) {
        return { success: false, message: 'Unidad no encontrada.' };
    }
    units.splice(unitIndex, 1);
    revalidatePath(`/clients/${clientId}/units`);
    return { success: true, message: 'Unidad eliminada con éxito.' };
}
