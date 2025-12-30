
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

const dateOrTimestamp = z.union([z.instanceof(Timestamp), z.date(), z.string()]);

export const InstallationStatus = z.enum(['pendiente', 'en-curso', 'terminado']);

export const InstallationPlan = z.enum([
    'estandar-sc',
    'avanzado-sc',
    'total-sc',
    'estandar-cc',
    'avanzado-cc',
    'total-cc',
]);

export const InstallationCategory = z.enum([
    'pesado', 
    'liviano',
    'moto lineal',
    'mototaxi'
]);

export const InstallationVehicle = z.enum([
    'auto',
    'camioneta',
    'camion',
    'furgón',
    'trailer'
]);

export const InstallationSegment = z.enum([
    'personal',
    'negocio', 
    'corporativo'
]);

export const PaymentMethod = z.enum(['efectivo', 'transferencia']);

export const LugarCorteMotor = z.enum(['Bomba', 'Ignición', 'Arranque']);


export const InstallationOrderSchema = z.object({
  id: z.string(),
  ownerId: z.string().optional(), // ID of the manager/master who created it
  tecnicoId: z.string().optional(),
  tecnicoNombre: z.string().optional(), // Denormalized for easy display
  
  // Fields from form
  placaVehiculo: z.string().min(1, 'La placa es requerida.'),
  nombreCliente: z.string().min(1, 'El nombre del cliente es requerido.'),
  ciudad: z.string().min(1, 'La ciudad es requerida.'),
  ubicacionGoogleMaps: z.string().url('Debe ser una URL válida de Google Maps.').optional().or(z.literal('')),
  numeroCliente: z.string().min(1, 'El número del cliente es requerido.'),
  tipoPlan: InstallationPlan,
  categoriaInstalacion: InstallationCategory,
  tipoVehiculo: InstallationVehicle,
  segmento: InstallationSegment,
  observacion: z.string().optional(),
  fechaProgramada: dateOrTimestamp,
  horaProgramada: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido.').optional(),
  estado: InstallationStatus.default('pendiente'),
  
  // Fields for completion
  metodoPago: PaymentMethod.optional(),
  corteDeMotor: z.boolean().optional(),
  lugarCorteMotor: LugarCorteMotor.optional(),
  
  instalacionAccesorios: z.boolean().optional(),
  accesorioBotonPanico: z.boolean().optional(),
  accesorioAperturaSeguro: z.boolean().optional(),
});


export type InstallationOrder = z.infer<typeof InstallationOrderSchema>;

// The form schema now correctly uses refine on the *omitted* schema.
export const InstallationOrderFormSchema = InstallationOrderSchema.omit({
    id: true,
    ownerId: true,
    tecnicoNombre: true,
}).refine(data => {
    // If status is 'terminado', 'metodoPago' must be defined and not undefined.
    if (data.estado === 'terminado') {
        return !!data.metodoPago;
    }
    return true;
}, {
    message: 'Debe seleccionar un método de pago al completar la orden.',
    path: ['metodoPago'],
}).refine(data => {
    // If motor cut is true, the location must be specified.
    if (data.corteDeMotor) {
        return !!data.lugarCorteMotor;
    }
    return true;
}, {
    message: 'Debe seleccionar el lugar del corte de motor.',
    path: ['lugarCorteMotor'],
});


export type InstallationOrderFormInput = z.infer<typeof InstallationOrderFormSchema>;
