
import { z } from 'zod';

export const QyvooMessageSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío.'),
});

export type QyvooMessageFormInput = z.infer<typeof QyvooMessageSchema>;
