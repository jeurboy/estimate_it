import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    try {
        const { payload } = await jwtVerify(token, secret);
        // ส่งข้อมูลผู้ใช้กลับไป แต่ไม่ควรส่งข้อมูลที่ละเอียดอ่อนทั้งหมด
        const user = { email: payload.email, role: payload.role, organization_id: payload.organization_id };
        return NextResponse.json({ user });
    } catch (err) {
        // Token ไม่ถูกต้องหรือหมดอายุ
        return NextResponse.json({ user: null }, { status: 401 });
    }
}
