import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user_stories, estimation_history } from '@/lib/db/schema';
import { eq, count, sum, desc, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const params = await context.params; // Await the params promise
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Ensure user is authenticated
        await jwtVerify(token, secret);

        const projectId = params.id;

        const [
            storyCountResult,
            estimationStatsResult,
            recentHistoryResult,
            estimationTrendResult
        ] = await Promise.all([
            db.select({ value: count() }).from(user_stories).where(eq(user_stories.project_id, projectId)),
            db.select({
                totalTasks: count(),
                totalMandays: sum(estimation_history.cost)
            }).from(estimation_history).where(and(eq(estimation_history.project_id, projectId), eq(estimation_history.is_reference, false))),
            db.select().from(estimation_history).where(and(eq(estimation_history.project_id, projectId), eq(estimation_history.is_reference, false))).orderBy(desc(estimation_history.created_at)).limit(5),
            db.select({ cost: estimation_history.cost, createdAt: estimation_history.created_at })
                .from(estimation_history)
                .where(and(eq(estimation_history.project_id, projectId), eq(estimation_history.is_reference, false)))
                .orderBy(estimation_history.created_at)
        ]);

        const storyCount = storyCountResult[0]?.value || 0;
        const totalTasks = estimationStatsResult[0]?.totalTasks || 0;
        const totalMandays = parseFloat(estimationStatsResult[0]?.totalMandays || '0');
        const averageMandays = totalTasks > 0 ? totalMandays / totalTasks : 0;

        // Process data for the trend chart
        const trendData = estimationTrendResult.reduce((acc, record) => {
            if (record.createdAt) { // Only process records with a valid date
                const date = new Date(record.createdAt).toISOString().split('T')[0]; // Group by day
                const cost = parseFloat(String(record.cost) || '0');
                if (!acc[date]) {
                    acc[date] = 0;
                }
                acc[date] += cost;
            }
            return acc;
        }, {} as Record<string, number>);

        const estimationTrend = Object.entries(trendData).map(([date, dailyTotal]) => ({
            date,
            totalMandays: parseFloat(dailyTotal.toFixed(2))
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return NextResponse.json({
            storyCount,
            totalTasks,
            totalMandays: parseFloat(totalMandays.toFixed(2)),
            averageMandays: parseFloat(averageMandays.toFixed(2)),
            recentHistory: recentHistoryResult,
            estimationTrend,
        });

    } catch (error) {
        console.error(`Error fetching dashboard data for project ${params.id}:`, error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
