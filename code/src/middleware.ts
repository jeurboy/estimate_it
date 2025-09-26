import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    const { pathname } = request.nextUrl;

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        const { payload } = await jwtVerify(token, secret);

        // Specific protection for /admin routes
        if (pathname.startsWith('/admin')) {
            const userRole = payload.role as string;
            if (userRole !== 'superadmin' && userRole !== 'admin') {
                // If not an admin/superadmin, show an "Access Denied" page
                return NextResponse.rewrite(new URL('/unauthorized', request.url));
            }
        }

        // For all other matched routes (like /projects), just being logged in is enough.
        return NextResponse.next();
    } catch (err) {
        // ถ้า token ไม่ถูกต้องหรือหมดอายุ
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

// กำหนด path ที่ต้องการให้ middleware นี้ทำงาน
export const config = {
    matcher: ['/admin/:path*', '/projects/:path*'], // Protect admin and projects routes
};
