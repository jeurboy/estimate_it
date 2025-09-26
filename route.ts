import { findSimilarEstimations } from '@/lib/db/history';
import { getEmbedding } from '@/lib/services/embeddingService';
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

    } catch (error: any) {
        console.error("Error in find-similar route:", error);

        // Check if the error is from the embedding service
        if (error.message.includes('embedding')) {
            return NextResponse.json({ error: `Failed to generate embedding: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ error: 'An internal server error occurred while finding similar tasks.' }, { status: 500 });
    }
}