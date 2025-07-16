import { z } from 'zod';

export const UnitPlanType = z.enum(['estandar-sc', 'avanzado-sc', 'total-sc', 'estandar-cc', 'avanzado-cc', 'total-cc']);
export type UnitPlanType = z.infer<typeof UnitPlanType>;

export const UnitContractType = z.enum(['sin_contrato', 'con_contrato']);
export type UnitContractType = z.infer<typeof UnitContractType>;

export const UnitSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  imei: z.string().min(1, 'IMEI es requerido.'),
  placa: z.string().min(1, 'Placa es requerida.'),
  modelo: z.string().optional(),
  tipoPlan: UnitPlanType,
  tipoContrato: UnitContractType,
  costoMensual: z.coerce.number().optional(),
  costoTotalContrato: z.coerce.number().optional(),
  mesesContrato: z.coerce.number().optional(),
  fechaInicioContrato: z.date({ required_error: 'Fecha de inicio es requerida.' }),
  fechaVencimiento: z.date({ required_error: 'Fecha de vencimiento es requerida.' }),
  ultimoPago: z.date().nullable(),
  fechaSiguientePago: z.date({ required_error: 'Fecha de siguiente pago es requerida.' }),
  observacion: z.string().optional(),
});

export type Unit = z.infer<typeof UnitSchema>;

export const UnitFormSchema = UnitSchema.omit({ id: true, clientId: true }).superRefine((data, ctx) => {
    if (data.tipoContrato === 'sin_contrato') {
        if (!data.costoMensual || data.costoMensual <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'El costo mensual es requerido y debe ser mayor a 0.',
                path: ['costoMensual'],
            });
        }
    } else if (data.tipoContrato === 'con_contrato') {
        if (!data.costoTotalContrato || data.costoTotalContrato <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'El costo total es requerido y debe ser mayor a 0.',
                path: ['costoTotalContrato'],
            });
        }
        if (!data.mesesContrato || data.mesesContrato <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Los meses de contrato son requeridos y deben ser mayor a 0.',
                path: ['mesesContrato'],
            });
        }
    }
});

export type UnitFormInput = z.infer<typeof UnitFormSchema>;
