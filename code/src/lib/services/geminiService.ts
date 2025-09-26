import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from '@google/generative-ai';

export interface SubTask {
    'Sub-Task': string;
    Description: string;
    Days: number;
}

export class EstimationError extends Error {
    status: number;
    constructor(message: string, status: number = 500) {
        super(message);
        this.name = 'EstimationError';
        this.status = status;
    }
}

class GeminiService {
    private model: GenerativeModel;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not provided to GeminiService.");
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
        });
    }

    private generationConfig = {
        temperature: 0.2,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
    };

    private safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    async estimateFeature(systemPrompt: string, featureDescription: string) {
        try {
            const contents = [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: "OK. I am ready. Please provide the feature description." }] },
                { role: 'user', parts: [{ text: featureDescription }] }
            ];

            const result = await this.model.generateContent({
                contents,
                generationConfig: this.generationConfig,
                safetySettings: this.safetySettings
            });
            const responseText = result.response.text();
            const estimation = JSON.parse(responseText);

            return {
                estimation,
                prompt: systemPrompt, // Return the prompt for logging
                rawResponse: responseText,
            };
        } catch (error: unknown) {
            console.error("Error in estimateFeature:", error);
            const message = error instanceof Error ? error.message : String(error);
            throw new EstimationError(`Failed to get estimation from AI: ${message}`);
        }
    }

    async generateStories(prompt: string, projectDescription: string) {
        try {
            const fullPrompt = `${prompt}${projectDescription}`;
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
                generationConfig: this.generationConfig,
                safetySettings: this.safetySettings,
            });
            return JSON.parse(result.response.text());
        } catch (error: unknown) {
            console.error("Error in generateStories:", error);
            const message = error instanceof Error ? error.message : String(error);
            throw new EstimationError(`Failed to generate stories from AI: ${message}`);
        }
    }
}

const geminiApiKey = process.env.GEMINI_API_KEY;
export const geminiService = new GeminiService(geminiApiKey || '');