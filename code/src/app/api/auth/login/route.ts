import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

interface CookieOptions {
    name: string;
    value: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
    maxAge?: number;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, rememberMe } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required.' },
                { status: 400 }
            );
        }

        // 1. ค้นหาผู้ใช้จากอีเมล (Using Drizzle ORM)
        const foundUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

        if (foundUsers.length === 0) {
            return NextResponse.json(
                { error: 'Invalid email or password.' },
                { status: 401 }
            );
        }

        const foundUser = foundUsers[0];

        // 2. เปรียบเทียบรหัสผ่าน
        const isPasswordMatch = await bcrypt.compare(password, foundUser.password_hash);

        if (!isPasswordMatch) {
            return NextResponse.json(
                { error: 'Invalid email or password.' },
                { status: 401 }
            );
        }

        // 3. สร้าง JWT Payload
        const payload = {
            id: foundUser.id,
            email: foundUser.email,
            role: foundUser.role,
            organization_id: foundUser.organization_id,
        };

        // 4. สร้าง Token
        const secret = new TextEncoder().encode(JWT_SECRET);
        const token = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('30d') // The token itself has a long life
            .sign(secret);

        // 5. ตั้งค่า Token ใน httpOnly cookie เพื่อความปลอดภัย
        const cookieOptions: CookieOptions = {
            name: 'auth_token',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        };

        if (rememberMe) {
            // 30 days expiration
            cookieOptions.maxAge = 30 * 24 * 60 * 60;
        }

        // If rememberMe is false, maxAge is not set, making it a session cookie.
        (await cookies()).set(cookieOptions.name, cookieOptions.value, cookieOptions);

        return NextResponse.json({
            user: { id: foundUser.id, email: foundUser.email, role: foundUser.role }
        });
    } catch (error) {
        console.error('Login API Error:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}