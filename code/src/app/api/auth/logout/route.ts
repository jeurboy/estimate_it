import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        // ใช้ฟังก์ชัน cookies() เพื่อลบ 'auth_token'
        const cookieStore = await cookies();
        cookieStore.delete('auth_token');

        return NextResponse.json({ message: 'Logout successful' }, { status: 200 });
    } catch (error) {
        console.error('Logout API Error:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
