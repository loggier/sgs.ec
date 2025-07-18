import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const TOKEN_NAME = 'user-token';

export async function POST() {
  try {
    // Set the cookie with maxAge 0 to effectively delete it
    cookies().set(TOKEN_NAME, '', { maxAge: -1, path: '/' });
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Logout failed' }, { status: 500 });
  }
}
