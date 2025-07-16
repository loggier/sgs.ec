import { z } from 'zod';

export const UserRole = z.enum(['master', 'manager', 'usuario']);
export type UserRole = z.infer<typeof UserRole>;

export const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.'),
  password: z.string(), // This will be the hashed password, so no length validation here
  role: UserRole,
});
export type User = z.infer<typeof UserSchema>;


// Schema for the form validation
export const UserFormSchema = (isEditing: boolean) => z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.'),
  password: isEditing 
    ? z.string().optional().refine(val => !val || val.length >= 6, {
        message: 'La nueva contraseña debe tener al menos 6 caracteres.',
      })
    : z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  role: UserRole,
});

export type UserFormInput = z.infer<ReturnType<typeof UserFormSchema>>;
