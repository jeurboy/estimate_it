import { db } from './index';
import { projects, Project } from './schema';
import { eq, desc } from 'drizzle-orm';

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
        const projectRecords = await db.select().from(projects).orderBy(desc(projects.created_at));
        return projectRecords.map(p => ({
            ...p,
            duration_months: parseFloat(p.duration_months),
        }));
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
        const [project] = await db.insert(projects).values({
            name_th: data.name_th,
            name_en: data.name_en,
            description: data.description,
            duration_months: String(data.duration_months),
        }).returning();
        return {
            ...project,
            duration_months: parseFloat(project.duration_months),
        };
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
        const [project] = await db.update(projects).set({
            name_th: data.name_th,
            name_en: data.name_en,
            description: data.description,
            duration_months: String(data.duration_months),
            updated_at: new Date(),
        }).where(eq(projects.id, id)).returning();
        if (!project) {
            throw new Error("Project not found for update.");
        }
        return {
            ...project,
            duration_months: parseFloat(project.duration_months),
        };
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
        const result = await db.delete(projects).where(eq(projects.id, id)).returning();
        if (result.length === 0) {
            return null;
        }
        const deletedProject = result[0];
        return { ...deletedProject, duration_months: parseFloat(deletedProject.duration_months) };
    } catch (error) {
        console.error("Database error in deleteProject:", error);
        throw new Error("Failed to delete project from the database.");
    }
}