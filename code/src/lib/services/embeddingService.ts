import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable not set.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

/**
 * Generates a vector embedding for a given text.
 * @param text The text to create an embedding for.
 * @returns A promise that resolves to an array of numbers representing the vector embedding.
 */
export async function getEmbedding(text: string): Promise<number[]> {
    try {
        const result = await model.embedContent({
            content: { parts: [{ text }], role: "user" },
            taskType: TaskType.RETRIEVAL_DOCUMENT,
        });
        return result.embedding.values;
    } catch (error) {
        console.error("Error getting embedding:", error);
        throw new Error("Failed to generate embedding due to an API error.");
    }
}