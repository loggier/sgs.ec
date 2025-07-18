
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Helper to accept Date or Firestore Timestamp
const dateOrTimestamp = z.union([z.instanceof(Timestamp), z.date()]);
const optionalDateOrTimestamp = dateOrTimestamp.nullable().optional();

export const ClientSchema = z.object({
  id: z.string().optional(),
  ownerId: z.string(), // Added owner field
  codTipoId: z.enum(['C', 'R'], { required_error: 'Tipo de ID es requerido.' }),
  codIdSujeto: z.string().min(1, 'Cédula o RUC es requerido.'),
  nomSujeto: z.string().min(1, 'Nombre es requerido.'),
  direccion: z.string().min(1, 'Dirección es requerida.'),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  numOperacion: z.string().min(1, 'Número de operación es requerido.'),
  fecConcesion: optionalDateOrTimestamp,
  valOperacion: z.coerce.number({invalid_type_error: "Debe ser un número"}).positive('El valor de operación debe ser positivo.').optional().nullable(),
  valorPago: z.coerce.number({invalid_type_error: "Debe ser un número"}).nonnegative('El valor de pago no puede ser negativo.').optional().nullable(),
  fecVencimiento: optionalDateOrTimestamp,
  valorVencido: z.coerce.number({invalid_type_error: "Debe ser un número"}).nonnegative('El valor vencido no puede ser negativo.').optional().nullable(),
  usuario: z.string().optional(),
  estado: z.enum(['al dia', 'adeuda', 'retirado'], {
    required_error: 'Estado es requerido.',
  }),
});

export type Client = z.infer<typeof ClientSchema>;

// New type for client lists that includes the owner's name
export type ClientWithOwner = Omit<Client, 'placaVehiculo'> & { ownerName?: string };
