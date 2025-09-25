import postgres from 'postgres';
import { URL } from 'url';
import { UserStory } from './schema';

const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
    throw new Error("POSTGRES_URL environment variable not set.");
}

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

/**
 * Creates a new user story for a given project.
 */
export async function createUserStory(projectId: string, storyText: string, featureName: string): Promise<UserStory> {
    try {
        const [story] = await sql<UserStory[]>`
            INSERT INTO user_stories (project_id, story_text, feature_name)
            VALUES (${projectId}, ${storyText}, ${featureName})
            RETURNING *;
        `;
        return story;
    } catch (error) {
        console.error("Database error in createUserStory:", error);
        throw new Error("Failed to create user story in the database.");
    }
}

/**
 * Lists all user stories for a given project.
 */
export async function listUserStoriesByProject(projectId: string): Promise<UserStory[]> {
    try {
        return await sql<UserStory[]>`
            SELECT * FROM user_stories
            WHERE project_id = ${projectId}
            ORDER BY created_at DESC;
        `;
    } catch (error) {
        console.error("Database error in listUserStoriesByProject:", error);
        throw new Error("Failed to retrieve user stories from the database.");
    }
}

/**
 * Updates an existing user story.
 * @param id The UUID of the user story to update.
 * @param storyText The new text for the user story.
 * @returns The updated user story record.
 */
export async function updateUserStory(id: string, storyText: string): Promise<UserStory> {
    try {
        const [story] = await sql<UserStory[]>`
            UPDATE user_stories
            SET story_text = ${storyText}
            WHERE id = ${id}
            RETURNING *;
        `;
        if (!story) {
            throw new Error("User story not found for update.");
        }
        return story;
    } catch (error) {
        console.error("Database error in updateUserStory:", error);
        throw new Error("Failed to update user story in the database.");
    }
}

/**
 * Deletes a user story from the database.
 * @param id The UUID of the user story to delete.
 * @returns The deleted user story record, or null if not found.
 */
export async function deleteUserStory(id: string): Promise<UserStory | null> {
    try {
        const result = await sql<UserStory[]>`
            DELETE FROM user_stories
            WHERE id = ${id}
            RETURNING *;
        `;
        if (result.count === 0) {
            return null;
        }
        return result[0];
    } catch (error) {
        console.error("Database error in deleteUserStory:", error);
        throw new Error("Failed to delete user story from the database.");
    }
}