
'use server';

import { revalidatePath } from 'next/cache';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserFormSchema, type User, type UserFormInput, ProfileFormSchema, type ProfileFormInput, UserRole } from './user-schema';
import bcrypt from 'bcryptjs';
import { createSession, deleteSession, getCurrentUser as getCurrentUserFromCookie } from './auth';

// Use bcrypt for secure password hashing.
const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};

// Helper function to fetch users without returning passwords
const fetchUsersFromFirestore = async (): Promise<User[]> => {
    const usersCollection = collection(db, 'users');
    const userSnapshot = await getDocs(usersCollection);
    return userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export async function loginUser(credentials: {username: string; password: string;}): Promise<{success: boolean; message: string; user?: User}> {
    try {
        const { username, password } = credentials;

        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, where("username", "==", username), limit(1));
        const userSnapshot = await getDocs(q);

        if (userSnapshot.empty) {
            return { success: false, message: 'Usuario o contraseña incorrectos.' };
        }

        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data() as User;

        if (!userData.password) {
             return { success: false, message: 'La cuenta de usuario está mal configurada. Contacte al administrador.' };
        }

        const passwordMatch = await comparePassword(password, userData.password);

        if (!passwordMatch) {
            return { success: false, message: 'Usuario o contraseña incorrectos.' };
        }
        
        const { password: _, ...userWithoutPassword } = { id: userDoc.id, ...userData };
        
        await createSession(userWithoutPassword);


        return { success: true, message: 'Inicio de sesión exitoso.', user: userWithoutPassword };

    } catch (error) {
        console.error("Error during login:", error);
        return { success: false, message: 'Ocurrió un error en el servidor.' };
    }
}

export async function logoutUser() {
    deleteSession();
}


export async function getUsers(currentUser: User | null): Promise<User[]> {
  try {
    if (!currentUser || !['master', 'manager'].includes(currentUser.role)) {
      return [];
    }

    const allUsers = await fetchUsersFromFirestore();
    const usersWithoutPassword = allUsers.map(({ password, ...user }) => user);

    if (currentUser.role === 'master') {
      return usersWithoutPassword;
    }

    if (currentUser.role === 'manager') {
      return usersWithoutPassword.filter(user => user.creatorId === currentUser.id);
    }
    
    return [];

  } catch (error) {
    console.error("Error getting users:", error);
    return [];
  }
}

export async function saveUser(
  data: UserFormInput,
  currentUser: User,
  id?: string
): Promise<{ success: boolean; message: string; user?: User }> {
  
  if (!currentUser || !['master', 'manager'].includes(currentUser.role)) {
      return { success: false, message: 'No tiene permiso para guardar usuarios.' };
  }

  const isEditing = !!id;
  const validation = UserFormSchema(isEditing).safeParse(data);

  if (!validation.success) {
    const errorMessages = validation.error.errors.map(e => e.message).join(', ');
    return { success: false, message: `Datos no válidos: ${errorMessages}` };
  }

  const { username, password, role, nombre, correo, telefono, empresa, nota } = validation.data;

  // Permission checks for role assignment
  if (currentUser.role === 'manager' && role !== 'analista') {
      return { success: false, message: 'Los managers solo pueden crear usuarios de tipo analista.' };
  }
  
  try {
    const usersCollection = collection(db, 'users');
    // Check for unique username
    const usernameQuery = query(usersCollection, where("username", "==", username), limit(1));
    const usernameSnapshot = await getDocs(usernameQuery);
    if (!usernameSnapshot.empty && usernameSnapshot.docs[0].id !== id) {
      return { success: false, message: 'El nombre de usuario ya existe.' };
    }

    // Check for unique email
    const emailQuery = query(usersCollection, where("correo", "==", correo), limit(1));
    const emailSnapshot = await getDocs(emailQuery);
    if (!emailSnapshot.empty && emailSnapshot.docs[0].id !== id) {
      return { success: false, message: 'El correo electrónico ya está en uso.' };
    }

    if (isEditing) {
      // Update existing user
      const userDocRef = doc(db, 'users', id);
      const userDataToUpdate: Partial<User> = { username, role, nombre, correo, telefono, empresa, nota };

      if (password) {
        userDataToUpdate.password = await hashPassword(password);
      }
      
      await updateDoc(userDocRef, userDataToUpdate as Record<string, any>);
      const updatedDoc = await getDoc(userDocRef);
      const { password: _, ...userWithoutPassword } = { id, ...updatedDoc.data() } as User;
      
      revalidatePath('/users');
      return { success: true, message: 'Usuario actualizado con éxito.', user: userWithoutPassword };
    } else {
      // Create new user
      const hashedPassword = await hashPassword(password);
      const newUser: Omit<User, 'id'| 'password'> & {password: string} = { 
          username, 
          password: hashedPassword, 
          role, 
          nombre, 
          correo, 
          telefono, 
          empresa, 
          nota,
          creatorId: currentUser.role === 'manager' ? currentUser.id : undefined,
      };
      
      const newUserRef = await addDoc(usersCollection, newUser);

      revalidatePath('/users');
      const { password: _, ...userWithoutPassword } = { id: newUserRef.id, ...newUser } as User;
      return { success: true, message: 'Usuario creado con éxito.', user: userWithoutPassword };
    }
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, message: `Error al guardar el usuario: ${errorMessage}` };
  }
}

export async function deleteUser(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !['master', 'manager'].includes(currentUser.role)) {
        return { success: false, message: 'No tiene permiso para eliminar usuarios.' };
    }

    const userDocRef = doc(db, 'users', id);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return { success: false, message: 'Usuario no encontrado.' };
    }
    
    const userToDelete = userDoc.data() as User;
    
    if (currentUser.role === 'manager' && userToDelete.creatorId !== currentUser.id) {
        return { success: false, message: 'No tiene permiso para eliminar a este usuario.' };
    }

    // Prevent deleting the last master user
    if (userToDelete.role === 'master') {
      const masterQuery = query(collection(db, 'users'), where("role", "==", "master"));
      const masterSnapshot = await getDocs(masterQuery);
      if (masterSnapshot.size <= 1) {
        return { success: false, message: 'No se puede eliminar el último usuario maestro.' };
      }
    }

    await deleteDoc(userDocRef);
    revalidatePath('/users');
    return { success: true, message: 'Usuario eliminado con éxito.' };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, message: 'Error al eliminar el usuario.' };
  }
}

export async function updateProfile(
    userId: string,
    data: ProfileFormInput
): Promise<{ success: boolean; message: string; user?: User }> {

    const validation = ProfileFormSchema.safeParse(data);

    if (!validation.success) {
        return { success: false, message: 'Datos no válidos.' };
    }

    const { password, ...profileData } = validation.data;

    try {
        const userDocRef = doc(db, 'users', userId);
        const userDataToUpdate: Partial<Omit<User, 'id' | 'username' | 'correo' | 'role'>> = {
            ...profileData,
        };

        if (password) {
            userDataToUpdate.password = await hashPassword(password);
        }

        await updateDoc(userDocRef, userDataToUpdate as Record<string, any>);
        
        // Fetch the updated user to get the complete object
        const updatedUserDoc = await getDoc(userDocRef);
        if (!updatedUserDoc.exists()) {
            return { success: false, message: 'No se pudo encontrar el usuario actualizado.' };
        }
        const { password: _, ...updatedUser } = { id: userId, ...updatedUserDoc.data() } as User;
        
        return { success: true, message: 'Perfil actualizado con éxito.', user: updatedUser };

    } catch (error) {
        console.error("Error updating profile:", error);
        return { success: false, message: 'Ocurrió un error inesperado al actualizar el perfil.' };
    }
}

export async function getCurrentUser(): Promise<User | null> {
    return await getCurrentUserFromCookie();
}
