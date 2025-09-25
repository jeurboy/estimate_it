import { NextResponse } from 'next/server';
import { deleteEstimation, updateEstimation } from '@/lib/db/history';
import { createErrorResponse } from '@/lib/utils/normalize';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();
        const { subTasks, cost, functionName, featureDescription } = body;

        if (!id) {
            return NextResponse.json({ error: 'Estimation ID is required.' }, { status: 400 });
        }
        // Add validation for the incoming body
        if (!Array.isArray(subTasks) || typeof cost !== 'number' || !functionName || !featureDescription) {
            return NextResponse.json({ error: 'Invalid data format for update.' }, { status: 400 });
        }

        const updatedRecord = await updateEstimation({ id, subTasks, cost, functionName, featureDescription });

        return NextResponse.json(updatedRecord);

    } catch (error: any) {
        return createErrorResponse(error, `PUT /api/history/${params.id}`);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        if (!id) {
            return NextResponse.json({ error: 'Estimation ID is required.' }, { status: 400 });
        }

        const deletedRecord = await deleteEstimation(id);

        if (!deletedRecord) {
            return NextResponse.json({ error: 'Estimation record not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Estimation deleted successfully.', deletedRecord });

    } catch (error: any) {
        console.error(`[API /api/history/${params.id}] DELETE Error:`, error);
        return NextResponse.json({ error: error.message || 'An internal server error occurred.' }, { status: 500 });
    }
}