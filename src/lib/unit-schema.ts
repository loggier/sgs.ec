import { z } from 'zod';

export const UnitPaymentFrequency = z.enum(['mensual', 'anual', 'contrato']);
export type UnitPaymentFrequency = z.infer<typeof UnitPaymentFrequency>;

export const UnitSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  imei: z.string().min(1, 'IMEI es requerido.'),
  placa: z.string().min(1, 'Placa es requerida.'),
  modelo: z.string().min(1, 'Modelo es requerido.'),
  frecuenciaPago: UnitPaymentFrequency,
  fechaInstalacion: z.date({ required_error: 'Fecha de instalación es requerida.' }),
  fechaVencimiento: z.date({ required_error: 'Fecha de vencimiento es requerida.' }),
  monto: z.coerce.number().positive('El monto debe ser un número positivo.'),
  ultimaRenovacion: z.date().nullable(),
  ultimoPago: z.date().nullable(),
  fechaSiguientePago: z.date({ required_error: 'Fecha de siguiente pago es requerida.' }),
  observacion: z.string().optional(),
});

export type Unit = z.infer<typeof UnitSchema>;

export const UnitFormSchema = UnitSchema.omit({ id: true, clientId: true });
export type UnitFormInput = z.infer<typeof UnitFormSchema>;
