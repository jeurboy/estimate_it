import { NextRequest, NextResponse } from 'next/server';
import { updateProject, deleteProject } from '@/lib/db/projects';
import { createErrorResponse } from '@/lib/utils/normalize';

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params; // Await the params promise
    const { id } = params; // Now you can safely access id
    try {
        const body = await request.json();
        const { name_th, name_en, duration_months, description } = body;

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required.' }, { status: 400 });
        }
        if (!name_th || !name_en || duration_months === undefined) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        const updatedRecord = await updateProject(id, { name_th, name_en, description: description || '', duration_months });

        return NextResponse.json(updatedRecord);

    } catch (error: unknown) {
        return createErrorResponse(error, `PUT /api/projects/${id}`);
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params; // Await the params promise
    const { id } = params; // Now you can safely access id
    try {
        const params = await context.params; // Await the params promise
        const { id } = params; // Now you can safely access id


        if (!id) {
            return NextResponse.json({ error: 'Project ID is required.' }, { status: 400 });
        }

        const deletedRecord = await deleteProject(id);

        if (!deletedRecord) {
            return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Project deleted successfully.', deletedRecord });

    } catch (error: unknown) {
        return createErrorResponse(error, `DELETE /api/projects/${id}`);
    }
}
