
import { z } from 'zod';

// --- Country Schema ---
export const CountrySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre del país es requerido.'),
  code: z.string().min(2, 'El código debe tener al menos 2 caracteres.').max(3, 'El código no puede tener más de 3 caracteres.'),
});

export type Country = z.infer<typeof CountrySchema>;
export type CountryFormInput = Omit<Country, 'id'>;


// --- City Schema ---
export const CitySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre de la ciudad es requerido.'),
  countryId: z.string().min(1, 'Debe seleccionar un país.'),
  countryName: z.string().optional(), // Denormalized for display
});

export type City = z.infer<typeof CitySchema>;
export type CityFormInput = Omit<City, 'id' | 'countryName'>;
