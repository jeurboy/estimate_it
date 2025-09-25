import postgres from 'postgres';
import pgvector from 'pgvector';
import { URL } from 'url';
import { EstimationHistory } from './schema';
import { SubTask } from '@/lib/services/geminiService';

const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
    throw new Error("POSTGRES_URL environment variable not set.");
}

// The `postgres` library can error on unrecognized connection string parameters.
// Some providers might add a `schema` parameter, which is not standard.
// We'll parse the URL, map `schema` to the correct `search_path` parameter,
// and remove it from the URL string to avoid the error.
const url = new URL(POSTGRES_URL);

interface CustomOptions extends postgres.Options<{}> {
    search_path?: string;
}

const options: CustomOptions = {};

if (url.searchParams.has('schema')) {
    options.search_path = url.searchParams.get('schema')!;
    url.searchParams.delete('schema');
}

const connectionString = url.toString();
// The `postgres` library provides connection pooling by default.
const sql = postgres(connectionString, options);

export interface SaveEstimationData {
    projectId: string | null;
    sourceProjectId: string | null;
    functionName: string;
    featureDescription: string;
    systemPrompt: string;
    subTasks: SubTask[]; // JSONB
    isReference: boolean;
    cost: number;
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
        const [savedRecord] = await sql<EstimationHistory[]>`
            INSERT INTO estimation_history (
                project_id, source_project_id, function_name, feature_description, system_prompt, is_reference, sub_tasks, cost, description_vector
            ) VALUES (
                ${data.projectId},
                ${data.sourceProjectId},
                ${data.functionName},
                ${data.featureDescription},
                ${data.systemPrompt},
                ${data.isReference},
                ${sql.json(data.subTasks as any)},
                ${data.cost},
                ${pgvector.toSql(data.descriptionVector)}
            )
            RETURNING *;
        `;
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
        if (searchTerm) {
            return await sql<EstimationHistory[]>`
                SELECT * FROM estimation_history
                WHERE function_name ILIKE ${'%' + searchTerm + '%'}
                ORDER BY created_at DESC;
            `;
        }
        return await sql<EstimationHistory[]>`
            SELECT * FROM estimation_history ORDER BY created_at DESC;
        `;
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
        return await sql<EstimationHistory[]>`
            SELECT * FROM estimation_history
            WHERE is_reference = TRUE -- Only search against reference estimations
            ORDER BY description_vector <=> ${pgvector.toSql(embedding)}
            LIMIT 3;
        `;
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
        const [updatedRecord] = await sql<EstimationHistory[]>`
            UPDATE estimation_history
            SET
                function_name = ${data.functionName},
                feature_description = ${data.featureDescription},
                sub_tasks = ${sql.json(data.subTasks as any)},
                cost = ${data.cost}
            WHERE id = ${data.id}
            RETURNING *;
        `;
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
        const result = await sql<EstimationHistory[]>`
            DELETE FROM estimation_history
            WHERE id = ${id}
            RETURNING *;
        `;
        if (result.count === 0) {
            return null;
        }
        return result[0];
    } catch (error) {
        console.error("Database error in deleteEstimation:", error);
        throw new Error("Failed to delete estimation from the database.");
    }
}