import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, organizations } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { desc, eq, or, isNull } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function GET(request: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { payload } = await jwtVerify(token, secret);
        const userRole = payload.role as string;
        const userOrgId = payload.organization_id as string | undefined;

        let whereCondition;
        if (userRole === 'admin' || userRole === 'user') {
            if (!userOrgId) {
                return NextResponse.json({ error: 'Forbidden: Admins and Users must belong to an organization to view projects.' }, { status: 403 });
            }
            whereCondition = eq(projects.organization_id, userOrgId);
        }
        // Superadmin has no whereCondition, sees all

        const allProjects = await db
            .select({
                id: projects.id,
                name_th: projects.name_th,
                name_en: projects.name_en,
                description: projects.description,
                duration_months: projects.duration_months,
                created_at: projects.created_at,
                organization_id: projects.organization_id,
                organizationName: organizations.name_en,
            })
            .from(projects)
            .where(whereCondition)
            .leftJoin(organizations, eq(projects.organization_id, organizations.id))
            .orderBy(desc(projects.created_at));

        return NextResponse.json(allProjects);
    } catch (error) {
        return NextResponse.json({ error: 'An internal server error or invalid token.' }, { status: 500 });
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
        const userRole = payload.role as string;
        const userOrgId = payload.organization_id as string | undefined;

        if (userRole === 'user') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { name_th, name_en, duration_months, description, organization_id } = body;

        if (!name_th || !name_en || duration_months === undefined) {
            return NextResponse.json({ error: 'Missing required fields: name_th, name_en, duration_months' }, { status: 400 });
        }

        const finalOrgId = userRole === 'admin' ? userOrgId : organization_id;

        const newProject = await db.insert(projects).values({
            name_th,
            name_en,
            description: description || '',
            duration_months,
            organization_id: finalOrgId || null,
        }).returning();

        return NextResponse.json(newProject[0], { status: 201 });

    } catch (error) {
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
