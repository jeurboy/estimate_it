import { NextResponse } from 'next/server';
import { geminiService, EstimationError } from '@/lib/services/geminiService';
import { createErrorResponse } from '@/lib/utils/normalize';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { featureDescription, systemPrompt } = body;

        if (!featureDescription) {
            return NextResponse.json(
                { error: 'Feature description is required.' },
                { status: 400 }
            );
        }

        if (!systemPrompt) {
            return NextResponse.json(
                { error: 'System prompt is required.' },
                { status: 400 }
            );
        }

        const result = await geminiService.estimateFeature(systemPrompt, featureDescription);

        return NextResponse.json(result);
    } catch (error: unknown) {
        return createErrorResponse(error, 'POST /api/estimate');
    }
}