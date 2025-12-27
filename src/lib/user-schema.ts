
import { z } from 'zod';

export const UserRole = z.enum(['master', 'manager', 'analista', 'usuario']);
export type UserRole = z.infer<typeof UserRole>;

const usernameValidation = z
  .string()
  .min(3, 'El nombre de usuario debe tener al menos 3 caracteres.')
  .regex(/^[a-zA-Z0-9_-]+$/, 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos.');

export const UserSchema = z.object({
  id: z.string(),
  username: usernameValidation,
  password: z.string(), // This will be the hashed password, so no length validation here
  role: UserRole,
  nombre: z.string().optional(),
  correo: z.string().email('Debe ser un correo electrónico válido.'),
  telefono: z.string().optional(),
  empresa: z.string().optional(),
  nota: z.string().optional(),
  creatorId: z.string().optional(), // ID of the manager who created this user (if role is 'analista')
  notificationUrl: z.string().url().optional(),
  unitCount: z.number().optional(), // Added field for unit count
});
export type User = z.infer<typeof UserSchema>;


// Schema for the user management form (by master/manager users)
export const UserFormSchema = (isEditing: boolean) => z.object({
  username: usernameValidation,
  password: isEditing 
    ? z.string().optional().refine(val => !val || val.length >= 6, {
        message: 'La nueva contraseña debe tener al menos 6 caracteres.',
      })
    : z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  role: UserRole,
  nombre: z.string().optional(),
  correo: z.string().email('El correo electrónico es obligatorio y debe ser válido.'),
  telefono: z.string().optional(),
  empresa: z.string().optional(),
  nota: z.string().optional(),
});

export type UserFormInput = z.infer<ReturnType<typeof UserFormSchema>>;


// Schema for the user's own profile editing form
export const ProfileFormSchema = z.object({
  nombre: z.string().optional(),
  telefono: z.string().optional(),
  empresa: z.string().optional(),
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: 'La nueva contraseña debe tener al menos 6 caracteres.',
  }),
  confirmPassword: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
});

export type ProfileFormInput = z.infer<typeof ProfileFormSchema>;
