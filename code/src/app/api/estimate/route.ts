import { NextResponse } from 'next/server';
import { geminiService } from '@/lib/services/geminiService';

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
    } catch (error: any) {
        console.error('[API /api/estimate] Error:', error);
        const status = error?.status || 500;
        const message = error?.message || 'An internal server error occurred.';
        return NextResponse.json({ error: message }, { status });
    }
}