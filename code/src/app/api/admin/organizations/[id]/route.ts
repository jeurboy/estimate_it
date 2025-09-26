import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations, users, projects } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { eq, desc } from 'drizzle-orm';

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
        if (payload.role !== 'superadmin' && payload.role !== 'admin') {
            return { error: 'Forbidden', status: 403 };
        }
        return { user: payload };
    } catch (err) {
        return { error: 'Invalid token', status: 401 }; // Corrected status
    }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const params = await context.params; // Await the params promise
    const auth = await authorizeSuperadmin();
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const orgId = params.id;

    // If the user is an admin, they can only access their own organization's details.
    const requestingUser = auth.user as { role: string; organization_id?: string };
    if (requestingUser.role === 'admin' && requestingUser.organization_id !== orgId) {
        return NextResponse.json({ error: 'Forbidden: You can only view your own organization.' }, { status: 403 });
    }

    try {
        // Fetch organization details and its users in parallel
        const [orgDetailsResult, orgUsersResult, orgProjectsResult] = await Promise.all([
            db.select().from(organizations).where(eq(organizations.id, orgId)),
            db.select({
                id: users.id,
                email: users.email,
                role: users.role,
                createdAt: users.createdAt,
            }).from(users).where(eq(users.organization_id, orgId)).orderBy(desc(users.createdAt)),
            db.select().from(projects).where(eq(projects.organization_id, orgId)).orderBy(desc(projects.created_at))
        ]);

        if (orgDetailsResult.length === 0) {
            return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
        }

        return NextResponse.json({
            organization: orgDetailsResult[0],
            users: orgUsersResult,
            projects: orgProjectsResult,
        });

    } catch (error) {
        console.error(`Error fetching details for organization ${orgId}:`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const params = await context.params; // Await the params promise
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

        const updatedOrg = await db.update(organizations)
            .set({
                name_th,
                name_en,
                description: description || '',
            })
            .where(eq(organizations.id, params.id))
            .returning();

        if (updatedOrg.length === 0) {
            return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
        }

        return NextResponse.json(updatedOrg[0]);
    } catch (error) {
        console.error(`Error updating organization ${params.id}:`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const params = await context.params; // Await the params promise
    const auth = await authorizeSuperadmin();
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        await db.delete(organizations).where(eq(organizations.id, params.id));
        return new NextResponse(null, { status: 204 }); // No Content
    } catch (error) {
        console.error(`Error deleting organization ${params.id}:`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
