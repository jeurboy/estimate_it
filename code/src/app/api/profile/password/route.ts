import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

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
        const { payload } = await jwtVerify(token, secret);
        const userId = payload.id as number;

        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Current and new passwords are required.' }, { status: 400 });
        }

        // 1. Fetch user from DB
        const userResult = await db.select({ password_hash: users.password_hash }).from(users).where(eq(users.id, userId));

        if (userResult.length === 0) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        const user = userResult[0];

        // 2. Verify current password_hash
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isPasswordValid) {
            return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
        }

        // 3. Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // 4. Update password_hash in DB
        await db.update(users)
            .set({ password_hash: newPasswordHash })
            .where(eq(users.id, userId));

        return new NextResponse(null, { status: 204 }); // Success, No Content

    } catch (error) {
        console.error('Password update error:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
