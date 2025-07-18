
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (user) {
      return NextResponse.json({ user });
    }
    return NextResponse.json({ user: null }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ user: null, error: 'Internal Server Error' }, { status: 500 });
  }
}
