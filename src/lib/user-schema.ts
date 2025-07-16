import { z } from 'zod';

export const UserRole = z.enum(['master', 'manager', 'usuario']);
export type UserRole = z.infer<typeof UserRole>;

export const UserSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  role: UserRole,
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.omit({ id: true });
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
