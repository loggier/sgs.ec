import { NextResponse } from 'next/server';
import { getLoginSession } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getLoginSession();
    if (!user) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user session:", error);
    return NextResponse.json({ message: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
}
