import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Define the structure of a single sub-task expected from the Gemini API
export interface SubTask {
    'Sub-Task': string;
    'Description': string;
    'Days': number;
}

// Define the structure of the entire JSON object expected from the Gemini API
interface EstimationResult {
    subTasks: SubTask[];
}

// Define the final output structure of the service
export interface GeminiEstimation {
    subTasks: SubTask[];
    cost: number;
    prompt: string;
    rawResponse: string;
}

// Pricing for gemini-1.5-flash-latest model as of May 2024.
const GEMINI_FLASH_INPUT_COST_PER_1K_TOKENS = 0.00035;
const GEMINI_FLASH_OUTPUT_COST_PER_1K_TOKENS = 0.00105;

/**
 * Performs feature estimation using the Gemini API.
 *
 * @param geminiApiKey The user's Gemini API key.
 * @param systemPrompt The prompt template fetched from the Google Sheet.
 * @param featureDescription The user-provided feature description.
 * @returns A promise that resolves to an object containing the sub-tasks, cost, full prompt, and raw response.
 */
export async function estimateFeature(
    geminiApiKey: string,
    systemPrompt: string,
    featureDescription: string
): Promise<GeminiEstimation> {
    try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash-latest',
            generationConfig: {
                responseMimeType: 'application/json', // Ensure the response is JSON
            },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
        });

        const fullPrompt = `${systemPrompt}\n\nFeature Description:\n${featureDescription}`;

        // Count tokens for cost calculation
        const { totalTokens: inputTokens } = await model.countTokens(fullPrompt);

        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const content = response.text();
        const rawResponseForLogging = JSON.stringify(response);

        const { totalTokens: outputTokens } = await model.countTokens(content);

        // Calculate cost
        const inputCost = (inputTokens / 1000) * GEMINI_FLASH_INPUT_COST_PER_1K_TOKENS;
        const outputCost = (outputTokens / 1000) * GEMINI_FLASH_OUTPUT_COST_PER_1K_TOKENS;
        const totalCost = inputCost + outputCost;

        // --- PARSING LOGIC ---
        // The Gemini API can return different structures based on the prompt.
        // This logic handles both the originally intended format `{"subTasks": [...]}`
        // and the observed format `{"userStories": [...]}` which caused the error.

        let parsedJson: any;
        try {
            parsedJson = JSON.parse(content);
        } catch (parseError) {
            console.error('Failed to parse Gemini response as JSON:', parseError);
            throw new Error(`Gemini returned an invalid format. Raw response: ${content}`);
        }

        let finalSubTasks: SubTask[] = [];

        // Handle the observed "userStories" format by transforming it.
        if (parsedJson.userStories && Array.isArray(parsedJson.userStories)) {
            finalSubTasks = parsedJson.userStories.flatMap((story: any) =>
                story.tasks?.map((task: any) => ({
                    'Sub-Task': task.task || 'Untitled Task',
                    'Description': Array.isArray(task.subTasks) && task.subTasks.length > 0
                        ? '- ' + task.subTasks.join('\n- ')
                        : task.dod || 'No description provided.',
                    'Complexity (1-5)': parseInt(task.estimatedDuration, 10) || 0,
                })) || []
            );
        }
        // Handle the original intended "subTasks" format.
        else if (parsedJson.subTasks && Array.isArray(parsedJson.subTasks)) {
            finalSubTasks = parsedJson.subTasks;
        } else {
            throw new Error("The Gemini response does not contain a recognizable 'subTasks' or 'userStories' array.");
        }

        return {
            subTasks: finalSubTasks,
            cost: totalCost,
            prompt: fullPrompt,
            rawResponse: rawResponseForLogging,
        };

    } catch (error: any) {
        console.error('Gemini API error:', error);
        // Provide a more user-friendly error message
        throw new Error(`An error occurred with the Gemini API. Please check your API key and ensure it has the necessary permissions. Details: ${error.message}`);
    }
}