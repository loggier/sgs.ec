
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Helper to accept Date or Firestore Timestamp
const dateOrTimestamp = z.union([z.instanceof(Timestamp), z.date()]);
const optionalDateOrTimestamp = dateOrTimestamp.nullable().optional();

// Schema for data stored locally for internal clients
export const ClientSchema = z.object({
  id: z.string().optional(),
  ownerId: z.string(), // Added owner field
  codTipoId: z.enum(['C', 'R'], { required_error: 'Tipo de ID es requerido.' }),
  codIdSujeto: z.string().min(1, 'Cédula o RUC es requerido.'),
  nomSujeto: z.string().min(1, 'Nombre es requerido.'),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  usuario: z.string().optional(),
  estado: z.enum(['al dia', 'adeuda', 'retirado'], {
    required_error: 'Estado es requerido.',
  }),
});

export type Client = z.infer<typeof ClientSchema>;

// This represents the enriched data we store for a WOX client locally.
export const WoxClientDataSchema = ClientSchema.pick({
    nomSujeto: true, 
    codTipoId: true,
    codIdSujeto: true,
    direccion: true,
    ciudad: true,
    telefono: true,
    usuario: true,
    estado: true,
}).partial(); // Make all fields optional for enrichment
export type WoxClientData = z.infer<typeof WoxClientDataSchema>;


// This is the final, combined object used throughout the app.
// It can represent either an internal client or a WOX client enriched with local data.
export type ClientDisplay = {
  id: string; // Firestore ID for internal, WOX ID for wox clients
  ownerId?: string;
  ownerName?: string;
  source: 'local' | 'wox';
  nomSujeto: string;
  codTipoId?: 'C' | 'R';
  codIdSujeto?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  correo?: string; // The non-editable WOX email
  managerEmail?: string;
  usuario?: string;
  estado: 'al dia' | 'adeuda' | 'retirado';
};
