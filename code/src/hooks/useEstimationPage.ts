'use client';

import { useState, useEffect } from 'react';
import { EstimationHistory, Project } from '@/lib/db/schema';
import { normalizeSubTask } from '@/lib/utils/normalize';
import { SubTask } from '@/lib/services/geminiService';
import { ChatMessage } from '@/components/ChatLog';

interface EstimationResult {
    subTasks: SubTask[];
    cost: number;
    prompt: string;
    rawResponse: string;
}

export const DEFAULT_SYSTEM_PROMPT = `คุณคือผู้เชี่ยวชาญด้านการประเมินผลทางวิศวกรรมซอฟต์แวร์ (Software Engineering Estimator) ภารกิจหลักของคุณคือการแบ่งงานที่ผู้ใช้ร้องขอออกเป็นงานย่อยทางเทคนิค (sub-tasks) และประเมินจำนวนวันทำงาน (man-days) ที่ต้องใช้สำหรับแต่ละงานย่อย โดย 1 วันทำงานเท่ากับ 6 ชั่วโมง 'days' สำหรับแต่ละงานย่อยสามารถเป็นทศนิยมได้ (เช่น 0.5, 1.5) ผลลัพธ์ของคุณต้องเป็น JSON object ที่ถูกต้องเท่านั้น โดยมี 'subTasks' (อาร์เรย์ของอ็อบเจกต์ที่มี 'task', 'days', และ 'description') และ 'cost' (ตัวเลขที่แสดงจำนวน man-days ทั้งหมด) **สำคัญ: ค่าทั้งหมดใน JSON object ต้องเป็นภาษาไทย**`;
const PROMPT_STORAGE_KEY = 'estimation_system_prompt';
const PROJECT_DESC_STORAGE_KEY = 'estimation_project_description';

/**
 * Formats historical estimation examples to be included in the system prompt.
 * @param projects An array of historical estimation records.
 * @returns A formatted string of examples.
 */
const formatExamplesForPrompt = (projects: EstimationHistory[]): string => {
    const examples = projects.map(p =>
        `---
EXAMPLE
Function Name: ${p.function_name}
Feature Description: ${p.feature_description}
Resulting JSON:
${JSON.stringify({ subTasks: p.sub_tasks.map(t => ({ 'Sub-Task': t['Sub-Task'], Description: t.Description, Days: t.Days })), cost: p.cost }, null, 2)}
---`).join('\n\n');
    return `\n\nHere are some examples of past estimations. Use them as a reference for style, structure, and complexity assessment:\n\n${examples}`;
};

export default function useEstimationPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [results, setResults] = useState<EstimationResult | null>(null);
    const [systemPrompt, setSystemPrompt] = useState('');
    const [lastPrompt, setLastPrompt] = useState<string | null>(null);
    const [rawResponse, setRawResponse] = useState<string | null>(null);
    const [projectDescription, setProjectDescription] = useState('');
    const [lastFeatureDescription, setLastFeatureDescription] = useState<string | null>(null);
    const [suggestedStory, setSuggestedStory] = useState<{ featureName: string; storyText: string } | null>(null);


    // Load prompt from local storage on initial render
    useEffect(() => {
        const savedPrompt = localStorage.getItem(PROMPT_STORAGE_KEY);
        const savedProjectDesc = localStorage.getItem(PROJECT_DESC_STORAGE_KEY);

        setSystemPrompt(savedPrompt || DEFAULT_SYSTEM_PROMPT);
        setProjectDescription(savedProjectDesc || '');
    }, []);

    // Save prompt to local storage whenever it changes
    useEffect(() => {
        if (systemPrompt) {
            localStorage.setItem(PROMPT_STORAGE_KEY, systemPrompt);
        }
    }, [systemPrompt]);

    // Save project description to local storage whenever it changes
    useEffect(() => {
        if (projectDescription) {
            localStorage.setItem(PROJECT_DESC_STORAGE_KEY, projectDescription);
        }
    }, [projectDescription]);

    const handleEstimate = async (taskDescription: string, projectContextDescription: string, projectId: string | undefined, isFromSavedStory: boolean) => {
        setIsLoading(true);
        setMessages([]);
        setResults(null);
        setSuggestedStory(null);

        // Combine project context with the specific task for the full description
        const fullFeatureDescription = `Project Context:\n${projectDescription}\n\nTask to Estimate:\n${taskDescription}`;

        setLastFeatureDescription(fullFeatureDescription); // Save for history

        const addMessage = (type: ChatMessage['type'], text: string) =>
            setMessages((prev) => [...prev, { type, text }]);

        addMessage('status', 'Starting estimation process...');

        try {
            // --- Find similar tasks and enhance the prompt ---
            addMessage('status', 'Finding similar reference tasks...');
            let finalSystemPrompt = systemPrompt; // Start with the base prompt

            try {
                const similarRes = await fetch('/api/find-similar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ featureDescription: taskDescription }),
                });

                if (similarRes.ok) {
                    const { similarTasks } = await similarRes.json();

                    if (similarTasks && similarTasks.length > 0) {
                        addMessage('status', `Found ${similarTasks.length} similar task(s). Using them as examples.`);
                        const examplesText = formatExamplesForPrompt(similarTasks);
                        finalSystemPrompt += examplesText;
                    } else {
                        addMessage('status', 'No reference tasks found. Proceeding with standard estimation.');
                    }
                } else {
                    addMessage('error', 'Could not fetch reference tasks. Proceeding without examples.');
                }
            } catch (similarError: unknown) {
                const errorMessage = similarError instanceof Error ? similarError.message : String(similarError);
                addMessage('error', `Error fetching reference tasks: ${errorMessage}. Proceeding without examples.`);
            }
            // --- End of T011 logic ---

            addMessage('status', 'Sending request to the estimation API...');
            const res = await fetch('/api/estimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Use the potentially enhanced prompt
                body: JSON.stringify({ featureDescription: fullFeatureDescription, systemPrompt: finalSystemPrompt }),
            });

            if (!res.ok) {
                let errorMessage = `API Error: ${res.status} ${res.statusText}`;
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (jsonError) {
                    // Response was not JSON
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();
            // The API returns a nested structure: { estimation: { subTasks, cost }, ... }
            if (!data || !data.estimation || !Array.isArray(data.estimation.subTasks) || (typeof data.estimation.cost !== 'number' && typeof data.estimation.cost !== 'string')) {
                throw new Error('Invalid response format from API.');
            }

            // Normalize the subTasks to ensure they match the expected SubTask structure.
            // This handles cases where the AI uses slightly different property names.
            const normalizedSubTasks: SubTask[] = data.estimation.subTasks.map(normalizeSubTask);

            const finalResult: EstimationResult = {
                subTasks: normalizedSubTasks,
                cost: parseFloat(String(data.estimation.cost)), // Ensure cost is always a number
                prompt: data.prompt, // Use the prompt returned from the service
                rawResponse: data.rawResponse,
            };
            addMessage('status', 'Estimation complete!');
            setResults(finalResult);
            setLastPrompt(finalResult.prompt);
            setRawResponse(finalResult.rawResponse);

            // After successful estimation, try to generate a user story ONLY if the input was manual
            if (!isFromSavedStory) {
                try {
                    addMessage('status', 'Generating user story suggestion...');
                    const suggestRes = await fetch('/api/suggest-story', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ taskDescription }),
                    });
                    if (suggestRes.ok) {
                        const suggested = await suggestRes.json();
                        setSuggestedStory(suggested);
                        addMessage('status', 'User story suggestion ready.');
                    }
                } catch (suggestError: unknown) {
                    // This is a non-critical error, so we just log it without failing the whole process
                    const errorMessage = suggestError instanceof Error ? suggestError.message : String(suggestError);
                    console.error("Could not generate story suggestion:", errorMessage);
                }
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            addMessage('error', `An error occurred: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveToHistory = async (functionName: string, isReference: boolean, projectId?: string): Promise<EstimationHistory | null> => {
        if (!results || !lastFeatureDescription) {
            setMessages((prev) => [...prev, { type: 'error', text: 'No results to save.' }]);
            return null;
        }

        setIsSaving(true);
        setMessages((prev) => [...prev, { type: 'status', text: `Saving estimation as "${functionName}"...` }]);

        const saveRecord = async (isRef: boolean, pId: string | null) => {
            const response = await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: pId,
                    sourceProjectId: isRef ? projectId : null, // If saving as a reference, the source is the current project
                    functionName: functionName,
                    featureDescription: lastFeatureDescription,
                    systemPrompt: results.prompt,
                    subTasks: results.subTasks,
                    isReference: isRef,
                    cost: results.cost,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to save as ${isRef ? 'reference' : 'history'}.`);
            }
            return response.json();
        };

        try {
            const promises = [];

            let historyRecordPromise: Promise<EstimationHistory> | null = null;

            // Always save as a history item for the current project
            if (projectId) {
                historyRecordPromise = saveRecord(false, projectId);
                promises.push(historyRecordPromise);
            }

            // If the checkbox is checked, also save as a global reference
            if (isReference) {
                promises.push(saveRecord(true, null));
            }

            if (promises.length === 0 && !projectId) {
                throw new Error("Cannot save history without a selected project.");
            }

            const [savedHistory] = await Promise.all(promises);

            let successMessage = 'Successfully saved to project history.';
            if (isReference) {
                successMessage += ' Also saved as a global reference.';
            }
            setMessages((prev) => [...prev, { type: 'status', text: successMessage }]);
            return historyRecordPromise ? savedHistory : null;
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setMessages((prev) => [...prev, { type: 'error', text: `Save failed: ${errorMessage}` }]);
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubTasksChange = (updatedTasks: SubTask[]) => {
        if (!results) return;

        // Recalculate the total cost (days) based on the updated tasks
        const newCost = updatedTasks.reduce((sum, task) => sum + (parseFloat(String(task.Days)) || 0), 0);

        setResults({
            ...results,
            subTasks: updatedTasks,
            cost: newCost,
        });

        setMessages((prev) => [
            ...prev,
            { type: 'status', text: 'Sub-task list updated.' }
        ]);
    };

    const handleResetPrompt = () => {
        setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        localStorage.removeItem(PROMPT_STORAGE_KEY);
        setMessages((prev) => [...prev, { type: 'status', text: 'Prompt has been reset to default.' }]);
    };

    const resetEstimation = () => {
        setMessages([]);
        setResults(null);
        setLastPrompt(null);
        setRawResponse(null);
        setSuggestedStory(null);
    };

    return {
        isLoading,
        isSaving,
        messages,
        results,
        systemPrompt,
        setSystemPrompt,
        lastPrompt,
        rawResponse,
        projectDescription,
        setProjectDescription,
        suggestedStory,
        handleEstimate,
        handleResetPrompt,
        handleSaveToHistory,
        handleSubTasksChange,
        resetEstimation,
    };
}
