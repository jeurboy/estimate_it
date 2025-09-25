import { EstimationHistory } from '@/lib/db/schema';

type ModalMode = 'edit' | 'clone' | 'new' | null;

/**
 * Fetches history records from the API.
 * @param search - An optional search term.
 * @returns A promise that resolves to an array of estimation history records.
 */
export async function fetchHistoryAPI(search: string): Promise<EstimationHistory[]> {
    const response = await fetch(`/api/history?search=${search}`);
    if (!response.ok) {
        throw new Error('Failed to fetch history');
    }
    const data = await response.json();
    return data.history;
}

/**
 * Deletes a history record via the API.
 * @param id - The ID of the record to delete.
 */
export async function deleteHistoryAPI(id: string): Promise<void> {
    const response = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete record.');
    }
}

/**
 * Saves (creates or updates) a history record via the API.
 * @param record - The estimation record to save.
 * @param modalMode - The mode ('new', 'clone', 'edit') to determine the API endpoint and method.
 * @returns The saved estimation history record.
 */
export async function saveHistoryAPI(record: EstimationHistory, modalMode: ModalMode): Promise<EstimationHistory> {
    const isNew = modalMode === 'new' || modalMode === 'clone';
    const url = isNew ? '/api/history' : `/api/history/${record.id}`;
    const method = isNew ? 'POST' : 'PUT';

    const body = isNew ? {
        projectId: null, // References are not tied to a project
        sourceProjectId: modalMode === 'clone' ? record.project_id : null,
        functionName: record.function_name,
        featureDescription: record.feature_description,
        systemPrompt: record.system_prompt,
        subTasks: record.sub_tasks,
        isReference: true,
        cost: parseFloat(String(record.cost)),
    } : {
        functionName: record.function_name,
        featureDescription: record.feature_description,
        subTasks: record.sub_tasks,
        cost: parseFloat(String(record.cost)),
    };

    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save data.');
    }

    return await response.json();
}
