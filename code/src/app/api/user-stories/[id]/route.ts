import { NextResponse } from 'next/server';
import { updateUserStory, deleteUserStory } from '@/lib/db/userStories';
import { createErrorResponse } from '@/lib/utils/normalize';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
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

    } catch (error: any) {
        return createErrorResponse(error, `PUT /api/user-stories/${params.id}`);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        if (!id) {
            return NextResponse.json({ error: 'User Story ID is required.' }, { status: 400 });
        }

        const deletedRecord = await deleteUserStory(id);

        if (!deletedRecord) {
            return NextResponse.json({ error: 'User Story not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User Story deleted successfully.', deletedRecord });

    } catch (error: any) {
        return createErrorResponse(error, `DELETE /api/user-stories/${params.id}`);
    }
}

