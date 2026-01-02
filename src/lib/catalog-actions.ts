
'use server';

import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from './firebase';
import { CountrySchema, type Country, CitySchema, type City, type CityFormInput } from './catalog-schema';
import type { User } from './user-schema';

const COUNTRIES_COLLECTION = 'countries';
const CITIES_COLLECTION = 'cities';

// --- Countries Actions ---

export async function getCountries(): Promise<Country[]> {
  try {
    const countriesCollectionRef = collection(db, COUNTRIES_COLLECTION);
    const q = query(countriesCollectionRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Country));
  } catch (error) {
    console.error("Error getting countries:", error);
    return [];
  }
}

export async function saveCountry(
  data: Omit<Country, 'id'>,
  user: User | null,
  countryId?: string
): Promise<{ success: boolean; message: string; }> {
  if (user?.role !== 'master') {
    return { success: false, message: 'Acción no permitida.' };
  }

  const validation = CountrySchema.omit({ id: true }).safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Datos no válidos.' };
  }

  try {
    if (countryId) {
      const countryDocRef = doc(db, COUNTRIES_COLLECTION, countryId);
      await updateDoc(countryDocRef, validation.data);
    } else {
      await addDoc(collection(db, COUNTRIES_COLLECTION), validation.data);
    }
    revalidatePath('/settings/countries');
    return { success: true, message: `País ${countryId ? 'actualizado' : 'creado'} con éxito.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, message };
  }
}

export async function deleteCountry(countryId: string, user: User | null): Promise<{ success: boolean; message: string }> {
  if (user?.role !== 'master') {
    return { success: false, message: 'Acción no permitida.' };
  }

  try {
    // Also delete all cities associated with this country
    const batch = writeBatch(db);
    const citiesQuery = query(collection(db, CITIES_COLLECTION), where('countryId', '==', countryId));
    const citiesSnapshot = await getDocs(citiesQuery);
    citiesSnapshot.forEach(cityDoc => {
        batch.delete(cityDoc.ref);
    });

    const countryDocRef = doc(db, COUNTRIES_COLLECTION, countryId);
    batch.delete(countryDocRef);
    
    await batch.commit();

    revalidatePath('/settings/countries');
    revalidatePath('/settings/cities');
    return { success: true, message: 'País y sus ciudades asociadas eliminados con éxito.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, message };
  }
}


// --- Cities Actions ---

export async function getCities(): Promise<City[]> {
  try {
    const citiesCollectionRef = collection(db, CITIES_COLLECTION);
    const q = query(citiesCollectionRef, orderBy('name', 'asc'));
    const citySnapshot = await getDocs(q);

    if (citySnapshot.empty) return [];

    const countriesSnapshot = await getDocs(collection(db, COUNTRIES_COLLECTION));
    const countryMap = new Map(countriesSnapshot.docs.map(doc => [doc.id, doc.data().name]));

    return citySnapshot.docs.map(doc => {
        const data = doc.data() as Omit<City, 'id'>;
        return {
            id: doc.id,
            ...data,
            countryName: countryMap.get(data.countryId) || 'País Desconocido',
        };
    });
  } catch (error) {
    console.error("Error getting cities:", error);
    return [];
  }
}

export async function saveCity(
  data: CityFormInput,
  user: User | null,
  cityId?: string
): Promise<{ success: boolean; message: string; }> {
  if (user?.role !== 'master') {
    return { success: false, message: 'Acción no permitida.' };
  }

  const validation = CitySchema.omit({ id: true, countryName: true }).safeParse(data);
  if (!validation.success) {
    return { success: false, message: 'Datos no válidos.' };
  }

  try {
    if (cityId) {
      const cityDocRef = doc(db, CITIES_COLLECTION, cityId);
      await updateDoc(cityDocRef, validation.data);
    } else {
      await addDoc(collection(db, CITIES_COLLECTION), validation.data);
    }
    revalidatePath('/settings/cities');
    return { success: true, message: `Ciudad ${cityId ? 'actualizada' : 'creada'} con éxito.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, message };
  }
}

export async function deleteCity(cityId: string, user: User | null): Promise<{ success: boolean; message: string }> {
  if (user?.role !== 'master') {
    return { success: false, message: 'Acción no permitida.' };
  }

  try {
    await deleteDoc(doc(db, CITIES_COLLECTION, cityId));
    revalidatePath('/settings/cities');
    return { success: true, message: 'Ciudad eliminada con éxito.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, message };
  }
}
