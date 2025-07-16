'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { users } from './user-data';
import { UserFormSchema, type User, type UserFormInput } from './user-schema';

export async function getUsers(): Promise<User[]> {
  // We should not return passwords, even hashed ones, to the client.
  return users.map(({ password, ...user }) => user) as User[];
}

export async function saveUser(
  data: UserFormInput,
  id?: string
): Promise<{ success: boolean; message: string; user?: User }> {
  const isEditing = !!id;
  const validation = UserFormSchema(isEditing).safeParse(data);

  if (!validation.success) {
    const errorMessages = validation.error.errors.map(e => e.message).join(', ');
    return { success: false, message: `Datos no válidos: ${errorMessages}` };
  }

  const { username, password, role, nombre, correo, telefono, empresa, nota } = validation.data;

  // Check for unique username if it's being changed or created
  if (users.some(u => u.username === username && u.id !== id)) {
    return { success: false, message: 'El nombre de usuario ya existe.' };
  }
  
  // Check for unique email if it's being changed or created
  if (users.some(u => u.correo === correo && u.id !== id)) {
    return { success: false, message: 'El correo electrónico ya está en uso.' };
  }

  try {
    if (isEditing) {
      // Update existing user
      const userIndex = users.findIndex(u => u.id === id);
      if (userIndex === -1) {
        return { success: false, message: 'Usuario no encontrado.' };
      }

      const updatedUser = { ...users[userIndex], username, role, nombre, correo, telefono, empresa, nota };

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updatedUser.password = hashedPassword;
      }

      users[userIndex] = updatedUser;

      revalidatePath('/users');
      const { password: _, ...userWithoutPassword } = updatedUser;
      return { success: true, message: 'Usuario actualizado con éxito.', user: userWithoutPassword as User };

    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUserId = (users.length + 1).toString() + Date.now();
      const newUser: User = {
        id: newUserId,
        username,
        password: hashedPassword,
        role,
        nombre,
        correo,
        telefono,
        empresa,
        nota,
      };
      users.push(newUser);

      revalidatePath('/users');
      const { password: _, ...userWithoutPassword } = newUser;
      return { success: true, message: 'Usuario creado con éxito.', user: userWithoutPassword as User };
    }
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, message: `Error al guardar el usuario: ${errorMessage}` };
  }
}

export async function deleteUser(id: string): Promise<{ success: boolean; message: string }> {
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex > -1) {
    // Prevent deleting the last master user
    const user = users[userIndex];
    if (user.role === 'master') {
        const masterUsers = users.filter(u => u.role === 'master');
        if (masterUsers.length <= 1) {
            return { success: false, message: 'No se puede eliminar el último usuario maestro.' };
        }
    }
    users.splice(userIndex, 1);
    revalidatePath('/users');
    return { success: true, message: 'Usuario eliminado con éxito.' };
  }
  return { success: false, message: 'Usuario no encontrado.' };
}
