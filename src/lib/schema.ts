import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Helper to accept Date or Firestore Timestamp
const dateOrTimestamp = z.union([z.instanceof(Timestamp), z.date()]);

export const ClientSchema = z.object({
  id: z.string().optional(),
  codTipoId: z.enum(['C', 'R'], { required_error: 'Tipo de ID es requerido.' }),
  codIdSujeto: z.string().min(1, 'Cédula o RUC es requerido.'),
  nomSujeto: z.string().min(1, 'Nombre es requerido.'),
  direccion: z.string().min(1, 'Dirección es requerida.'),
  ciudad: z.string().min(1, 'Ciudad es requerida.'),
  telefono: z.string().min(1, 'Teléfono es requerido.'),
  numOperacion: z.string().min(1, 'Número de operación es requerido.'),
  fecConcesion: dateOrTimestamp.refine(val => val !== null, { message: 'Fecha de concesión es requerida.' }),
  valOperacion: z.coerce.number({invalid_type_error: "Debe ser un número"}).positive('El valor de operación debe ser positivo.'),
  valorPago: z.coerce.number({invalid_type_error: "Debe ser un número"}).nonnegative('El valor de pago no puede ser negativo.'),
  fecVencimiento: dateOrTimestamp.refine(val => val !== null, { message: 'Fecha de vencimiento es requerida.' }),
  valorVencido: z.coerce.number({invalid_type_error: "Debe ser un número"}).nonnegative('El valor vencido no puede ser negativo.'),
  usuario: z.string().min(1, 'Usuario es requerido.'),
  estado: z.enum(['al dia', 'adeuda', 'retirado'], {
    required_error: 'Estado es requerido.',
  }),
});

export type Client = z.infer<typeof ClientSchema>;
