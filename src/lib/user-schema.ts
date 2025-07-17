
import { z } from 'zod';

export const UserRole = z.enum(['master', 'manager', 'usuario']);
export type UserRole = z.infer<typeof UserRole>;

export const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.'),
  password: z.string(), // This will be the hashed password, so no length validation here
  role: UserRole,
  nombre: z.string().optional(),
  correo: z.string().email('Debe ser un correo electrónico válido.'),
  telefono: z.string().optional(),
  empresa: z.string().optional(),
  nota: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;


// Schema for the user management form (by master users)
export const UserFormSchema = (isEditing: boolean) => z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.'),
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
