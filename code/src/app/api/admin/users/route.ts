import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, userRoleEnum, organizations } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { desc, eq, count, and, ne } from 'drizzle-orm';
import { hash } from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    // ตรวจสอบสิทธิ์ผู้ใช้จาก Token
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { payload } = await jwtVerify(token, secret);
        const requestingUserRole = payload.role as string;
        const requestingUserOrgId = payload.organization_id as string | undefined;

        // Allow both superadmin and admin to access this route
        if (requestingUserRole !== 'superadmin' && requestingUserRole !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const offset = (page - 1) * pageSize;

        // Build the query condition based on the user's role
        let whereCondition;
        if (requestingUserRole === 'admin') {
            if (!requestingUserOrgId) {
                // An admin must belong to an organization to see any users.
                return NextResponse.json({ users: [], totalCount: 0 });
            }
            // Admins see users in their org, but not superadmins
            whereCondition = and(
                eq(users.organization_id, requestingUserOrgId),
                ne(users.role, 'superadmin')
            );
        }

        // Fetch paginated users and total count in parallel
        const [paginatedUsers, totalCountResult] = await Promise.all([
            db
                .select({
                    id: users.id,
                    email: users.email,
                    role: users.role,
                    createdAt: users.createdAt,
                    organization_id: users.organization_id,
                    organizationName: organizations.name_en,
                })
                .from(users)
                .where(whereCondition) // Apply the condition here
                .leftJoin(organizations, eq(users.organization_id, organizations.id))
                .orderBy(desc(users.createdAt))
                .limit(pageSize)
                .offset(offset),
            db.select({ value: count() }).from(users).where(whereCondition), // And here for the count
        ]);

        const totalCount = totalCountResult[0].value;

        return NextResponse.json({
            users: paginatedUsers,
            totalCount,
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        // ถ้า Token ไม่ถูกต้องหรือมีปัญหาอื่นๆ
        return NextResponse.json({ error: 'An internal server error occurred or invalid token.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { payload } = await jwtVerify(token, secret);
        const requestingUserRole = payload.role as string;
        const requestingUserOrgId = payload.organization_id as string | undefined;

        if (requestingUserRole !== 'superadmin' && requestingUserRole !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { email, password, role, organization_id } = body;

        if (!email || !password || !role) {
            return NextResponse.json({ error: 'Email, password, and role are required.' }, { status: 400 });
        }

        if (!userRoleEnum.enumValues.includes(role) || role === 'superadmin') {
            return NextResponse.json({ error: 'Invalid role specified.' }, { status: 400 });
        }

        const existingUser = await db.select().from(users).where(eq(users.email, email));
        if (existingUser.length > 0) {
            return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 });
        }

        // If the creator is an admin, force the new user into the admin's organization
        const final_organization_id = requestingUserRole === 'admin' ? requestingUserOrgId : organization_id;

        // Optional: Validate that the organization exists if an ID is provided
        if (final_organization_id) {
            const orgExists = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, final_organization_id));
            if (orgExists.length === 0) {
                return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
            }
        }

        const passwordHash = await hash(password, 10);

        const newUsers = await db.insert(users).values({
            email,
            password_hash: passwordHash,
            role,
            organization_id: final_organization_id || null,
        }).returning({ id: users.id, email: users.email, role: users.role });

        return NextResponse.json(newUsers[0], { status: 201 });

    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
