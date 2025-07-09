import { z } from 'zod';

export const ClientSchema = z.object({
  id: z.string().optional(),
  codTipoId: z.enum(['C', 'R'], { required_error: 'Tipo de ID es requerido.' }),
  codIdSujeto: z.string().min(1, 'Cédula o RUC es requerido.'),
  nomSujeto: z.string().min(1, 'Nombre es requerido.'),
  direccion: z.string().min(1, 'Dirección es requerida.'),
  ciudad: z.string().min(1, 'Ciudad es requerida.'),
  telefono: z.string().min(1, 'Teléfono es requerido.'),
  numOperacion: z.string().min(1, 'Número de operación es requerido.'),
  fecConcesion: z.date({ required_error: 'Fecha de concesión es requerida.' }),
  valOperacion: z.coerce.number({invalid_type_error: "Debe ser un número"}).positive('El valor de operación debe ser positivo.'),
  valorPago: z.coerce.number({invalid_type_error: "Debe ser un número"}).nonnegative('El valor de pago no puede ser negativo.'),
  fecVencimiento: z.date({ required_error: 'Fecha de vencimiento es requerida.' }),
  valorVencido: z.coerce.number({invalid_type_error: "Debe ser un número"}).nonnegative('El valor vencido no puede ser negativo.'),
  placaVehiculo: z.string().min(1, 'Placa es requerida.'),
  tipoPlan: z.enum(
    ['estandar sc', 'avanzado sc', 'total sc', 'estandar cc', 'avanzado cc', 'total cc'],
    { required_error: 'Tipo de plan es requerido.' }
  ),
  usuario: z.string().min(1, 'Usuario es requerido.'),
  estado: z.enum(['al día', 'adeuda', 'retirado'], {
    required_error: 'Estado es requerido.',
  }),
});

export type Client = z.infer<typeof ClientSchema>;
