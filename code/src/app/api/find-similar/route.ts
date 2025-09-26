import { findSimilarEstimations } from '@/lib/db/history';
import { getEmbedding } from '@/lib/services/embeddingService';
import { createErrorResponse } from '@/lib/utils/normalize';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { featureDescription } = await request.json();

        if (!featureDescription) {
            return NextResponse.json({ error: 'featureDescription is required' }, { status: 400 });
        }

        // 1. Create an embedding from the user's input.
        const embedding = await getEmbedding(featureDescription);

        // 2. Use the embedding to find similar tasks in the database.
        const similarTasks = await findSimilarEstimations(embedding);

        return NextResponse.json({ similarTasks });

    } catch (error: unknown) {
        return createErrorResponse(error, 'POST /api/find-similar');
    }
}
