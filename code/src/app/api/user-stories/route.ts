import { NextResponse } from 'next/server';
import { createUserStory, listUserStoriesByProject } from '@/lib/db/userStories';
import { createErrorResponse } from '@/lib/utils/normalize';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId query parameter is required.' }, { status: 400 });
        }

        const stories = await listUserStoriesByProject(projectId);
        return NextResponse.json({ stories });

    } catch (error: any) {
        return createErrorResponse(error, 'GET /api/user-stories');
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { projectId, storyText, featureName } = body;

        if (!projectId || !storyText || !featureName) {
            return NextResponse.json({ error: 'Missing required fields: projectId, storyText, featureName' }, { status: 400 });
        }

        const newStory = await createUserStory(projectId, storyText, featureName);
        return NextResponse.json(newStory, { status: 201 });

    } catch (error: any) {
        return createErrorResponse(error, 'POST /api/user-stories');
    }
}
