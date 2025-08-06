
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Helper to accept Date or Firestore Timestamp
const dateOrTimestamp = z.union([z.instanceof(Timestamp), z.date()]);
const optionalDateOrTimestamp = dateOrTimestamp.nullable().optional();

// Schema for data stored locally for internal clients
export const ClientSchema = z.object({
  id: z.string().optional(),
  ownerId: z.string(), // Added owner field
  pgpsId: z.string().optional(), // ID from P. GPS API to link accounts
  codTipoId: z.enum(['C', 'R'], { required_error: 'Tipo de ID es requerido.' }),
  codIdSujeto: z.string().min(1, 'Cédula o RUC es requerido.'),
  nomSujeto: z.string().min(1, 'Nombre es requerido.'),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  usuario: z.string().optional(), // This field will store the P. GPS email for linking
  estado: z.enum(['al dia', 'adeuda', 'retirado'], {
    required_error: 'Estado es requerido.',
  }),
  tipoCliente: z.enum(['Personal', 'Negocio', 'Corporativo']).optional(),
});

export type Client = z.infer<typeof ClientSchema>;

// This is the final, combined object used throughout the app.
export type ClientDisplay = Client & {
  id: string; // Firestore ID for internal
  ownerName?: string;
  correo?: string; // Derived from 'usuario' if linked
  // Calculated financial fields
  totalContractAmount?: number;
  totalContractBalance?: number;
  totalMonthlyPayment?: number;
  unitCount?: number;
};
