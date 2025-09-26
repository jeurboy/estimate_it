import { db } from './index';
import { estimation_history as estimationHistory, EstimationHistory } from './schema';

import { SubTask } from '@/lib/services/geminiService';
import { sql, eq, ilike, and, asc, desc } from 'drizzle-orm';
import pgvector from 'pgvector/pg';

export interface SaveEstimationData {
    projectId: string | null;
    sourceProjectId: string | null;
    functionName: string;
    featureDescription: string;
    systemPrompt: string;
    subTasks: SubTask[]; // JSONB
    isReference: boolean;
    cost: string;
    descriptionVector: number[];
}

/**
 * Saves a new estimation record to the database.
 * @param data The estimation data to save.
 * @returns The newly created estimation history record.
 */
export async function saveEstimation(data: SaveEstimationData): Promise<EstimationHistory> {
    console.log("Saving estimation with data:", data);
    try {
        const [savedRecord] = await db.insert(estimationHistory).values({
            project_id: data.projectId,
            source_project_id: data.sourceProjectId,
            function_name: data.functionName,
            feature_description: data.featureDescription,
            system_prompt: data.systemPrompt,
            is_reference: data.isReference,
            sub_tasks: data.subTasks,
            cost: data.cost,
            // Drizzle pgvector handles the conversion automatically
            description_vector: data.descriptionVector,
        }).returning();
        return savedRecord;
    } catch (error) {
        console.error("Database error in saveEstimation:", error);
        throw new Error("Failed to save estimation to the database.");
    }
}

/**
 * Retrieves a list of all estimations, with an optional search filter.
 * @param searchTerm An optional string to filter project names by.
 * @returns A promise that resolves to an array of estimation history records.
 */
export async function listEstimations(searchTerm?: string): Promise<EstimationHistory[]> {
    try {
        const query = db.select().from(estimationHistory).orderBy(desc(estimationHistory.created_at));
        if (searchTerm) {
            query.where(ilike(estimationHistory.function_name, `%${searchTerm}%`));
        }
        return await query;
    } catch (error) {
        console.error("Database error in listEstimations:", error);
        throw new Error("Failed to retrieve estimations from the database.");
    }
}

/**
 * Finds the top 3 most semantically similar estimations based on a vector.
 * This function only searches records where `is_reference` is TRUE.
 * @param embedding The vector embedding of the feature description to search for.
 * @returns A promise that resolves to an array of the most similar estimation history records.
 */
export async function findSimilarEstimations(embedding: number[]): Promise<EstimationHistory[]> {
    try {
        return await db.select()
            .from(estimationHistory)
            .where(and(eq(estimationHistory.is_reference, true)))
            .orderBy(sql`description_vector <=> ${pgvector.toSql(embedding)}`)
            .limit(3);
    } catch (error) {
        console.error("Database error in findSimilarEstimations:", error);
        throw new Error("Failed to find similar estimations in the database.");
    }
}

export interface UpdateEstimationData {
    id: string;
    functionName: string;
    featureDescription: string;
    subTasks: SubTask[];
    cost: number;
}

/**
 * Updates an existing estimation record in the database.
 * @param data The data to update, including the record ID.
 * @returns The updated estimation history record.
 */
export async function updateEstimation(data: UpdateEstimationData): Promise<EstimationHistory> {
    try {
        const [updatedRecord] = await db.update(estimationHistory).set({
            function_name: data.functionName,
            feature_description: data.featureDescription,
            sub_tasks: data.subTasks,
            cost: String(data.cost),
        }).where(eq(estimationHistory.id, data.id)).returning();
        if (!updatedRecord) {
            throw new Error("Record not found for update.");
        }
        return updatedRecord;
    } catch (error) {
        console.error("Database error in updateEstimation:", error);
        throw new Error("Failed to update estimation in the database.");
    }
}

/**
 * Deletes an estimation record from the database by its ID.
 * @param id The UUID of the estimation record to delete.
 * @returns The deleted record, or null if not found.
 */
export async function deleteEstimation(id: string): Promise<EstimationHistory | null> {
    try {
        const result = await db.delete(estimationHistory).where(eq(estimationHistory.id, id)).returning();
        return result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error("Database error in deleteEstimation:", error);
        throw new Error("Failed to delete estimation from the database.");
    }
}