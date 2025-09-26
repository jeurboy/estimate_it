import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations, users, projects } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { desc, eq, sql, countDistinct } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

const secret = new TextEncoder().encode(JWT_SECRET);

async function authorizeSuperadmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return { error: 'Unauthorized', status: 401 };

    try {
        const { payload } = await jwtVerify(token, secret);
        if (payload.role !== 'superadmin') {
            return { error: 'Forbidden', status: 403 };
        }
        return { user: payload };
    } catch (err) {
        return { error: 'Invalid token', status: 401 };
    }
}

export async function GET() {
    const auth = await authorizeSuperadmin();
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const allOrganizations = await db
            .select({
                id: organizations.id,
                name_th: organizations.name_th,
                name_en: organizations.name_en,
                description: organizations.description,
                created_at: organizations.created_at,
                userCount: sql<number>`count(DISTINCT ${users.id})`.mapWith(Number),
                projectCount: sql<number>`count(DISTINCT ${projects.id})`.mapWith(Number),
            })
            .from(organizations)
            .leftJoin(users, eq(organizations.id, users.organization_id))
            .leftJoin(projects, eq(organizations.id, projects.organization_id))
            .groupBy(organizations.id)
            .orderBy(desc(organizations.created_at));
        return NextResponse.json(allOrganizations);
    } catch (error) {
        console.error('Error fetching organizations:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await authorizeSuperadmin();
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const body = await request.json();
        const { name_th, name_en, description } = body;

        if (!name_th || !name_en) {
            return NextResponse.json({ error: 'Thai and English names are required.' }, { status: 400 });
        }

        const newOrg = await db.insert(organizations).values({
            name_th,
            name_en,
            description: description || '',
        }).returning();

        return NextResponse.json(newOrg[0], { status: 201 });

    } catch (error) {
        console.error('Error creating organization:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
