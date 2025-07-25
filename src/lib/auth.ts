
import 'server-only';
import { cookies } from 'next/headers';
import type { User } from './user-schema';
import { SignJWT, jwtVerify } from 'jose';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const secretKey = process.env.SECRET_KEY;
if (!secretKey) {
    throw new Error('La variable de entorno SECRET_KEY no está definida.');
}
const encodedKey = new TextEncoder().encode(secretKey);
const TOKEN_NAME = 'user-token';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export async function createSession(user: Omit<User, 'password'>) {
    const token = await new SignJWT(user)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(encodedKey);

    cookies().set(TOKEN_NAME, token, {
        maxAge: MAX_AGE,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
    });
}

export function deleteSession() {
    cookies().set(TOKEN_NAME, '', {
        maxAge: -1,
        path: '/',
    });
}


export async function getCurrentUser(): Promise<User | null> {
    const token = cookies().get(TOKEN_NAME)?.value;

    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, encodedKey, {
            algorithms: ['HS256'],
        });

        // Fetch latest user data to ensure session is fresh
        const userId = payload.id as string;
        if (!userId) return null;

        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return null; // User deleted since token was issued
        }
        
        const { password, ...user } = { id: userDoc.id, ...userDoc.data() } as User;
        return user;
    } catch (error) {
        console.log('Failed to verify session token:', (error as Error).message);
        return null;
    }
}
