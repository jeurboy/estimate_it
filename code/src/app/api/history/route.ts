import { NextResponse } from 'next/server';
import { getEmbedding } from '@/lib/services/embeddingService';
import { createErrorResponse } from '@/lib/utils/normalize';
import { saveEstimation, listEstimations } from '@/lib/db/history';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            projectId,
            sourceProjectId,
            functionName,
            featureDescription,
            systemPrompt,
            subTasks,
            cost,
            isReference,
        } = body;

        // Comprehensive validation for all required fields
        if (!functionName || typeof functionName !== 'string') {
            return NextResponse.json({ error: 'functionName is required and must be a string.' }, { status: 400 });
        }
        if (!featureDescription || typeof featureDescription !== 'string') {
            return NextResponse.json({ error: 'featureDescription is required and must be a string.' }, { status: 400 });
        }
        if (!systemPrompt || typeof systemPrompt !== 'string') {
            return NextResponse.json({ error: 'systemPrompt is required and must be a string.' }, { status: 400 });
        }
        if (!Array.isArray(subTasks)) {
            return NextResponse.json({ error: 'subTasks is required and must be an array.' }, { status: 400 });
        }
        if (typeof cost !== 'number') {
            return NextResponse.json({ error: 'cost is required and must be a number.' }, { status: 400 });
        }
        if (typeof isReference !== 'boolean') {
            return NextResponse.json({ error: 'isReference is required and must be a boolean.' }, { status: 400 });
        }

        // 1. Generate an embedding for the feature description.
        const descriptionVector = await getEmbedding(featureDescription);

        // 2. Save the complete estimation record to the database.
        const savedRecord = await saveEstimation({
            projectId,
            sourceProjectId,
            functionName,
            featureDescription,
            systemPrompt,
            subTasks,
            isReference,
            cost,
            descriptionVector,
        });

        // 3. Return the newly created record with a 201 status.
        return NextResponse.json(savedRecord, { status: 201 });

    } catch (error: any) {
        return createErrorResponse(error, 'POST /api/history');
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const searchTerm = searchParams.get('search') || undefined;

        // 1. Fetch estimations from the database, applying search term if present.
        const history = await listEstimations(searchTerm);

        // 2. Return the list of historical records.
        return NextResponse.json({ history });

    } catch (error: any) {
        return createErrorResponse(error, 'GET /api/history');
    }
}