'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { users } from './user-data';
import { CreateUserSchema, type User, type CreateUserInput } from './user-schema';

// This is a mock database implementation.

export async function getUsers(): Promise<User[]> {
  // In a real app, you would not return the password hash.
  // This is simplified for demonstration purposes.
  return users;
}

export async function createUser(data: CreateUserInput): Promise<{ success: boolean; message: string; user?: User }> {
  const validation = CreateUserSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, message: 'Datos proporcionados no válidos.' };
  }

  const { username, password, role } = validation.data;

  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    return { success: false, message: 'El nombre de usuario ya existe.' };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = (users.length + 1).toString() + Date.now();
    const newUser: User = {
      id,
      username,
      password: hashedPassword,
      role,
    };
    users.push(newUser);

    revalidatePath('/users');
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return {
      success: true,
      message: 'Usuario creado con éxito.',
      user: userWithoutPassword as User,
    };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, message: `Error al crear el usuario: ${errorMessage}` };
  }
}
