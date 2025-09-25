import postgres from 'postgres';
import { URL } from 'url';
import { Project } from './schema';

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
const sql = postgres(connectionString, options);

export interface ProjectData {
    name_th: string;
    name_en: string;
    description: string;
    duration_months: number;
}

/**
 * Retrieves a list of all projects.
 * @returns A promise that resolves to an array of projects.
 */
export async function listProjects(): Promise<Project[]> {
    try {
        return await sql<Project[]>`
            SELECT * FROM projects ORDER BY created_at DESC;
        `;
    } catch (error) {
        console.error("Database error in listProjects:", error);
        throw new Error("Failed to retrieve projects from the database.");
    }
}

/**
 * Creates a new project record in the database.
 * @param data The project data to create.
 * @returns The newly created project record.
 */
export async function createProject(data: ProjectData): Promise<Project> {
    try {
        const [project] = await sql<Project[]>`
            INSERT INTO projects (name_th, name_en, description, duration_months)
            VALUES (${data.name_th}, ${data.name_en}, ${data.description}, ${data.duration_months})
            RETURNING *;
        `;
        return project;
    } catch (error) {
        console.error("Database error in createProject:", error);
        throw new Error("Failed to create project in the database.");
    }
}

/**
 * Updates an existing project record.
 * @param id The UUID of the project to update.
 * @param data The new data for the project.
 * @returns The updated project record.
 */
export async function updateProject(id: string, data: ProjectData): Promise<Project> {
    try {
        const [project] = await sql<Project[]>`
            UPDATE projects
            SET name_th = ${data.name_th},
                name_en = ${data.name_en},
                description = ${data.description},
                duration_months = ${data.duration_months},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *;
        `;
        if (!project) {
            throw new Error("Project not found for update.");
        }
        return project;
    } catch (error) {
        console.error("Database error in updateProject:", error);
        throw new Error("Failed to update project in the database.");
    }
}

/**
 * Deletes a project record from the database.
 * @param id The UUID of the project to delete.
 * @returns The deleted project record, or null if not found.
 */
export async function deleteProject(id: string): Promise<Project | null> {
    try {
        const result = await sql<Project[]>`
            DELETE FROM projects
            WHERE id = ${id}
            RETURNING *;
        `;
        if (result.count === 0) {
            return null;
        }
        return result[0];
    } catch (error) {
        console.error("Database error in deleteProject:", error);
        throw new Error("Failed to delete project from the database.");
    }
}