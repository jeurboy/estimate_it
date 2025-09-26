import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

const secret = new TextEncoder().encode(JWT_SECRET);

interface ProjectUpdateValues {
    name_th: string;
    name_en: string;
    description: string;
    duration_months: number;
    organization_id?: string | null;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const params = await context.params; // Await the params promise
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
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        if (userRole === 'admin') {
            const projectToUpdate = await db.select({ organization_id: projects.organization_id }).from(projects).where(eq(projects.id, params.id));
            if (projectToUpdate.length === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
            if (projectToUpdate[0].organization_id !== userOrgId) {
                return NextResponse.json({ error: 'Forbidden: You can only edit projects in your organization.' }, { status: 403 });
            }
        }

        const valuesToUpdate: Partial<Omit<ProjectUpdateValues, 'duration_months'> & { duration_months: string }> = {
            name_th,
            name_en,
            description: description || '',
            duration_months: String(duration_months)
        };
        if (userRole === 'superadmin') {
            valuesToUpdate.organization_id = organization_id || null;
        }

        const updatedProject = await db.update(projects).set(valuesToUpdate).where(eq(projects.id, params.id)).returning();

        return NextResponse.json(updatedProject[0]);

    } catch (error) {
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const params = await context.params; // Await the params promise
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

        if (userRole === 'admin') {
            const projectToDelete = await db.select({ organization_id: projects.organization_id }).from(projects).where(eq(projects.id, params.id));
            if (projectToDelete.length === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
            if (projectToDelete[0].organization_id !== userOrgId) {
                return NextResponse.json({ error: 'Forbidden: You can only delete projects in your organization.' }, { status: 403 });
            }
        }

        const deletedProject = await db.delete(projects).where(eq(projects.id, params.id)).returning();

        if (deletedProject.length === 0) {
            return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
        }

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
