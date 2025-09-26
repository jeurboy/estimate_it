import { NextRequest, NextResponse } from 'next/server';
import { updateUserStory, deleteUserStory } from '@/lib/db/userStories';
import { createErrorResponse } from '@/lib/utils/normalize';

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params; // Await the params promise
    const { id } = params; // Now you can safely access id

    try {
        const body = await request.json();
        const { storyText } = body;

        if (!id) {
            return NextResponse.json({ error: 'User Story ID is required.' }, { status: 400 });
        }
        if (!storyText) {
            return NextResponse.json({ error: 'storyText is required.' }, { status: 400 });
        }

        const updatedRecord = await updateUserStory(id, storyText);
        return NextResponse.json(updatedRecord);

    } catch (error: unknown) {
        return createErrorResponse(error, `PUT /api/user-stories/${id}`);
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params; // Await the params promise
    const { id } = params; // Now you can safely access id
    try {

        if (!id) {
            return NextResponse.json({ error: 'User Story ID is required.' }, { status: 400 });
        }

        const deletedRecord = await deleteUserStory(id);

        if (!deletedRecord) {
            return NextResponse.json({ error: 'User Story not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User Story deleted successfully.', deletedRecord });

    } catch (error: unknown) {
        return createErrorResponse(error, `DELETE /api/user-stories/${id}`);
    }
}
