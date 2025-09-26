import { SubTask } from '@/lib/services/geminiService';
import { NextResponse } from 'next/server';

/**
 * Represents the possible shapes of a sub-task object coming from the AI.
 */
interface RawSubTask {
    'Sub-Task'?: string;
    task?: string;
    taskName?: string;
    name?: string;
    Description?: string;
    description?: string;
    details?: string;
    Days?: number | string;
    days?: number | string;
}

/**
 * Normalizes a raw sub-task object from an AI response into a consistent SubTask format.
 * It checks for various possible property names for task, description, and days.
 *
 * @param item - The raw object from the AI's sub-tasks array.
 * @returns A normalized SubTask object.
 */
export function normalizeSubTask(item: RawSubTask): SubTask {
    const task = item['Sub-Task'] || item.task || item.taskName || item.name || 'N/A';
    const description = item.Description || item.description || item.details || '';
    const days = parseFloat(String(item.Days || item.days || '0'));

    return {
        'Sub-Task': task,
        'Description': description,
        'Days': isNaN(days) ? 0 : days,
    };
}

/**
 * Creates a standardized JSON error response for API routes.
 * @param error - The error object.
 * @param context - A string describing the context where the error occurred, for logging.
 * @param status - The HTTP status code to return.
 * @returns A NextResponse object.
 */
export function createErrorResponse(error: unknown, context: string, status: number = 500): NextResponse {
    console.error(`[API Error in ${context}]:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';

    return NextResponse.json(
        { error: errorMessage },
        { status }
    );
}