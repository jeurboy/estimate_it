
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { hash, compare } from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function PUT(request: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { payload: requestingUser } = await jwtVerify(token, secret);
        const userId = requestingUser.userId as number;

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Current password and new password are required.' }, { status: 400 });
        }

        // 1. ดึงข้อมูลผู้ใช้ปัจจุบันจากฐานข้อมูล
        const foundUsers = await db.select().from(users).where(eq(users.id, userId));
        if (foundUsers.length === 0) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }
        const user = foundUsers[0];

        // 2. ตรวจสอบรหัสผ่านปัจจุบัน
        const isPasswordMatch = await compare(currentPassword, user.password_hash);
        if (!isPasswordMatch) {
            return NextResponse.json({ error: 'Incorrect current password.' }, { status: 403 });
        }

        // 3. เข้ารหัสรหัสผ่านใหม่และอัปเดตลงฐานข้อมูล
        const newPasswordHash = await hash(newPassword, 10);
        await db.update(users)
            .set({ password_hash: newPasswordHash })
            .where(eq(users.id, userId));

        return NextResponse.json({ message: 'Password updated successfully.' });

    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
