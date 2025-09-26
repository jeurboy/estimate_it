import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { compare } from 'bcrypt';
import { db } from '@/lib/db'; // สมมติว่าคุณมีไฟล์สำหรับเชื่อมต่อ DB
import { users } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required.' },
                { status: 400 }
            );
        }

        // 1. ค้นหาผู้ใช้จากอีเมล (Using Drizzle ORM)
        const foundUsers = await db.select().from(users).where(eq(users.email, email));

        if (foundUsers.length === 0) {
            return NextResponse.json(
                { error: 'Invalid email or password.' },
                { status: 401 }
            );
        }

        const foundUser = foundUsers[0];

        // 2. เปรียบเทียบรหัสผ่าน
        const isPasswordMatch = await compare(password, foundUser.password_hash);

        if (!isPasswordMatch) {
            return NextResponse.json(
                { error: 'Invalid email or password.' },
                { status: 401 }
            );
        }

        // 3. สร้าง JWT Payload
        const payload = {
            userId: foundUser.id,
            email: foundUser.email,
            role: foundUser.role,
            organization_id: foundUser.organization_id,
        };

        // 4. สร้าง Token
        const token = sign(payload, JWT_SECRET!, { expiresIn: '1h' });

        // 5. ตั้งค่า Token ใน httpOnly cookie เพื่อความปลอดภัย
        const cookieStore = await cookies();
        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60, // 1 ชั่วโมง
        });

        return NextResponse.json({
            message: 'Login successful',
            user: { role: foundUser.role }
        });
    } catch (error) {
        console.error('Login API Error:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}