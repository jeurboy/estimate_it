import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable not set.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// The model for text embeddings, as specified in the plan.
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

/**
 * Generates a vector embedding for a given text using Google's text-embedding-004 model.
 *
 * @param text The input string to generate an embedding for.
 * @returns A promise that resolves to an array of numbers representing the vector embedding.
 * @throws If the embedding generation fails.
 */
export async function getEmbedding(text: string): Promise<number[]> {
    try {
        const result = await embeddingModel.embedContent(text);
        const embedding = result.embedding;
        if (!embedding || !embedding.values) {
            throw new Error("Failed to generate embedding: No values returned from the model.");
        }
        return embedding.values;
    } catch (error: any) {
        console.error("Error generating embedding:", error);
        throw new Error(`Failed to generate text embedding: ${error.message}`);
    }
}