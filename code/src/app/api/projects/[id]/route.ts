import { NextResponse } from 'next/server';
import { updateProject, deleteProject } from '@/lib/db/projects';
import { createErrorResponse } from '@/lib/utils/normalize';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
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

    } catch (error: any) {
        return createErrorResponse(error, `PUT /api/projects/${params.id}`);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        if (!id) {
            return NextResponse.json({ error: 'Project ID is required.' }, { status: 400 });
        }

        const deletedRecord = await deleteProject(id);

        if (!deletedRecord) {
            return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Project deleted successfully.', deletedRecord });

    } catch (error: any) {
        return createErrorResponse(error, `DELETE /api/projects/${params.id}`);
    }
}
