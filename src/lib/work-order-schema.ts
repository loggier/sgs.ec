
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

const dateOrTimestamp = z.union([z.instanceof(Timestamp), z.date(), z.string()]);

export const WorkOrderPriority = z.enum(['alta', 'media', 'baja']);
export const WorkOrderStatus = z.enum(['pendiente', 'en-progreso', 'completada']);

export const WorkOrderSchema = z.object({
  id: z.string(),
  ownerId: z.string().optional(), // ID of the manager/master who created it
  tecnicoId: z.string().optional(),
  tecnicoNombre: z.string().optional(), // Denormalized for easy display
  placaVehiculo: z.string().min(1, 'La placa es requerida.'),
  nombreCliente: z.string().min(1, 'El nombre del cliente es requerido.'),
  ciudad: z.string().min(1, 'La ciudad es requerida.'),
  ubicacionGoogleMaps: z.string().url('Debe ser una URL válida de Google Maps.').optional().or(z.literal('')),
  numeroCliente: z.string().min(1, 'El número del cliente es requerido.'),
  prioridad: WorkOrderPriority,
  descripcion: z.string().min(1, 'La descripción es requerida.'),
  observacion: z.string().optional(), // Note for the technician
  fechaProgramada: dateOrTimestamp,
  estado: WorkOrderStatus.default('pendiente'),
});

export type WorkOrder = z.infer<typeof WorkOrderSchema>;

export const WorkOrderFormSchema = WorkOrderSchema.omit({
    id: true,
    ownerId: true,
    tecnicoNombre: true,
});

export type WorkOrderFormInput = z.infer<typeof WorkOrderFormSchema>;
