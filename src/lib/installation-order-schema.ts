
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

const dateOrTimestamp = z.union([z.instanceof(Timestamp), z.date(), z.string()]);

export const InstallationStatus = z.enum(['pendiente', 'en-curso', 'terminado']);

export const InstallationPlan = z.enum([
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
  estado: InstallationStatus.default('pendiente'),
  metodoPago: PaymentMethod.optional(),
});


export type InstallationOrder = z.infer<typeof InstallationOrderSchema>;

export const InstallationOrderFormSchema = InstallationOrderSchema.omit({
    id: true,
    ownerId: true,
    tecnicoNombre: true,
}).refine(data => {
    // If status is 'terminado', 'metodoPago' must be defined.
    if (data.estado === 'terminado') {
        return data.metodoPago !== undefined;
    }
    return true;
}, {
    message: 'Debe seleccionar un método de pago al completar la orden.',
    path: ['metodoPago'],
});

export type InstallationOrderFormInput = z.infer<typeof InstallationOrderFormSchema>;
