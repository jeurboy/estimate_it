import { NextResponse } from 'next/server';
import { getEmbedding } from '@/lib/services/embeddingService';
import { createErrorResponse } from '@/lib/utils/normalize';
import { findSimilarEstimations } from '@/lib/db/history';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { featureDescription } = body;

        if (!featureDescription || typeof featureDescription !== 'string') {
            return NextResponse.json(
                { error: 'featureDescription is required and must be a string.' },
                { status: 400 }
            );
        }

        // 1. Generate an embedding for the input description
        const embedding = await getEmbedding(featureDescription);

        // 2. Find similar estimations in the database
        const similarProjects = await findSimilarEstimations(embedding);

        // 3. Return the results
        return NextResponse.json({ similarProjects });

    } catch (error: unknown) {
        return createErrorResponse(error, 'POST /api/history/find-similar');
    }
}
