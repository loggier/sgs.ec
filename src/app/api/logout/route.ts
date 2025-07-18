
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Set the cookie with maxAge 0 to effectively delete it
    cookies().set('user', '', { maxAge: 0, path: '/' });
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Logout failed' }, { status: 500 });
  }
}
