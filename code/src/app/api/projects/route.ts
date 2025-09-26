import { NextResponse } from 'next/server';
import { listProjects, createProject } from '@/lib/db/projects';
import { createErrorResponse } from '@/lib/utils/normalize';

export async function GET() {
    try {
        const projects = await listProjects();
        return NextResponse.json({ projects });
    } catch (error: unknown) {
        return createErrorResponse(error, 'GET /api/projects');
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name_th, name_en, duration_months, description } = body;

        if (!name_th || !name_en || duration_months === undefined) {
            return NextResponse.json({ error: 'Missing required fields: name_th, name_en, duration_months' }, { status: 400 });
        }

        if (typeof duration_months !== 'number') {
            return NextResponse.json({ error: 'duration_months must be a number.' }, { status: 400 });
        }

        const newProject = await createProject({
            name_th,
            name_en,
            description: description || '', // Default to empty string if not provided
            duration_months,
        });

        return NextResponse.json(newProject, { status: 201 });

    } catch (error: unknown) {
        return createErrorResponse(error, 'POST /api/projects');
    }
}
