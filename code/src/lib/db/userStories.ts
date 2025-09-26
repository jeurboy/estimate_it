import { db } from './index';
import { user_stories as userStories, UserStory } from './schema';
import { eq, desc, and } from 'drizzle-orm';

/**
 * Creates a new user story for a given project.
 */
export async function createUserStory(projectId: string, storyText: string, featureName: string): Promise<UserStory> {
    try {
        const [story] = await db.insert(userStories).values({
            project_id: projectId,
            story_text: storyText,
            feature_name: featureName,
        }).returning();
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
        return await db.select()
            .from(userStories)
            .where(eq(userStories.project_id, projectId))
            .orderBy(desc(userStories.created_at));
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
        const [story] = await db.update(userStories)
            .set({ story_text: storyText })
            .where(eq(userStories.id, id)).returning();
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
        const result = await db.delete(userStories).where(eq(userStories.id, id)).returning();
        return result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error("Database error in deleteUserStory:", error);
        throw new Error("Failed to delete user story from the database.");
    }
}