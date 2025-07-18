import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/user-schema';
import bcrypt from 'bcryptjs';
import { setLoginSession } from '@/lib/auth';

const comparePassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Usuario y contraseña son requeridos.' }, { status: 400 });
    }

    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where("username", "==", username), limit(1));
    const userSnapshot = await getDocs(q);

    if (userSnapshot.empty) {
      return NextResponse.json({ message: 'Usuario o contraseña incorrectos.' }, { status: 401 });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data() as User;

    const passwordMatch = await comparePassword(password, userData.password);

    if (!passwordMatch) {
      return NextResponse.json({ message: 'Usuario o contraseña incorrectos.' }, { status: 401 });
    }
    
    const { password: _, ...userWithoutPassword } = { id: userDoc.id, ...userData };

    await setLoginSession(userWithoutPassword);

    return NextResponse.json({ success: true, user: userWithoutPassword });

  } catch (error) {
    console.error("Error during login:", error);
    return NextResponse.json({ message: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
}