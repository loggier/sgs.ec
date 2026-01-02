
'use server';

import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import { collection, getDocs, writeBatch, limit, query } from 'firebase/firestore';
import { db } from './firebase';

const CIUDADES_COLLECTION = 'ciudades';

interface CityRecord {
  ID: number;
  PROVINCIA: string;
  CANTON: string;
  ESTADO: string;
}

export async function importCities(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Check if the collection already exists and has data
    const citiesCollectionRef = collection(db, CIUDADES_COLLECTION);
    const q = query(citiesCollectionRef, limit(1));
    const existingDataSnapshot = await getDocs(q);

    if (!existingDataSnapshot.empty) {
      return {
        success: true,
        message: 'La base de datos de ciudades ya existe. No se requiere ninguna acción.',
      };
    }

    // 2. Read the XLSX file from the public directory
    const filePath = path.join(process.cwd(), 'public', 'import', 'ciudades.xlsx');
    if (!fs.existsSync(filePath)) {
      return { success: false, message: 'El archivo de importación (ciudades.xlsx) no se encuentra.' };
    }

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: CityRecord[] = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return { success: false, message: 'El archivo de ciudades está vacío o tiene un formato incorrecto.' };
    }

    // 3. Use a batch write to import all data at once
    const batch = writeBatch(db);
    let count = 0;

    data.forEach(record => {
      if (record.PROVINCIA && record.CANTON) {
        const cityDocRef = citiesCollectionRef.doc(); // Auto-generate ID
        const cityData = {
          provincia: record.PROVINCIA.trim(),
          canton: record.CANTON.trim(),
          estado: record.ESTADO === 'A', // Convert 'A' to true (active), others to false
        };
        batch.set(cityDocRef, cityData);
        count++;
      }
    });

    await batch.commit();

    return {
      success: true,
      message: `¡Éxito! Se importaron ${count} ciudades a la base de datos.`,
    };
  } catch (error) {
    console.error('Error importing cities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, message: `Error al importar ciudades: ${errorMessage}` };
  }
}
