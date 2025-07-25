
import { z } from 'zod';

// --- WOX Integration Settings ---
export const WoxSettingsSchema = z.object({
  url: z.string().url('Debe ser una URL válida.'),
  user: z.string().min(1, 'El usuario es requerido.'),
  apiKey: z.string().min(1, 'La API Key es requerida.'),
});

export type WoxSettings = z.infer<typeof WoxSettingsSchema>;
export type WoxSettingsFormInput = WoxSettings;
