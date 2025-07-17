
import { cookies } from 'next/headers';
import type { User } from './user-schema';

export async function getCurrentUser(): Promise<User | null> {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');

    if (userCookie?.value) {
        try {
            const user: User = JSON.parse(userCookie.value);
            return user;
        } catch (e) {
            console.error('Failed to parse user cookie', e);
            return null;
        }
    }
    return null;
}
