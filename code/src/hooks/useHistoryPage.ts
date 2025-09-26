'use client';

import { useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import { fetchHistoryAPI, deleteHistoryAPI } from '@/services/historyApiService';
import { DEFAULT_SYSTEM_PROMPT } from '@/hooks/useEstimationPage';
import { EstimationHistory } from '@/lib/db/schema';
import { useDebounce } from 'use-debounce';

type ModalMode = 'edit' | 'clone' | 'new' | null;

interface HistoryPageState {
    history: EstimationHistory[];
    loading: boolean;
    isSaving: boolean;
    error: string | null;
    selectedRecord: EstimationHistory | null;
    isModalVisible: boolean;
    modalMode: ModalMode;
}

type HistoryPageAction =
    | { type: 'FETCH_START' }
    | { type: 'FETCH_SUCCESS'; payload: EstimationHistory[] }
    | { type: 'FETCH_ERROR'; payload: string }
    | { type: 'SAVE_START' }
    | { type: 'SAVE_SUCCESS'; payload: EstimationHistory }
    | { type: 'UPDATE_SUCCESS'; payload: EstimationHistory }
    | { type: 'SAVE_ERROR'; payload: string }
    | { type: 'DELETE_SUCCESS'; payload: string }
    | { type: 'OPEN_MODAL'; payload: { mode: ModalMode; record?: EstimationHistory } }
    | { type: 'CLOSE_MODAL' }
    | { type: 'SET_SELECTED_RECORD'; payload: EstimationHistory | null };

const initialState: HistoryPageState = {
    history: [],
    loading: true,
    isSaving: false,
    error: null,
    selectedRecord: null,
    isModalVisible: false,
    modalMode: null,
};

function historyPageReducer(state: HistoryPageState, action: HistoryPageAction): HistoryPageState {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, loading: false, history: action.payload };
        case 'FETCH_ERROR':
            return { ...state, loading: false, error: action.payload };
        case 'SAVE_START':
            return { ...state, isSaving: true, error: null };
        case 'SAVE_SUCCESS':
            return { ...state, isSaving: false, history: [...state.history, action.payload] };
        case 'UPDATE_SUCCESS':
            return { ...state, isSaving: false, history: state.history.map(item => item.id === action.payload.id ? action.payload : item) };
        case 'SAVE_ERROR':
            return { ...state, isSaving: false, error: action.payload };
        case 'DELETE_SUCCESS':
            return { ...state, history: state.history.filter(item => item.id !== action.payload) };
        case 'OPEN_MODAL':
            return { ...state, isModalVisible: true, modalMode: action.payload.mode, selectedRecord: action.payload.record || null };
        case 'CLOSE_MODAL':
            return { ...state, isModalVisible: false, modalMode: null, selectedRecord: null };
        case 'SET_SELECTED_RECORD':
            return { ...state, selectedRecord: action.payload };
        default:
            return state;
    }
}

export const useHistoryPage = () => {
    const [state, dispatch] = useReducer(historyPageReducer, initialState);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

    // Memoized derived states for the two tabs
    const referenceHistory = useMemo(() => state.history.filter(item => item.is_reference), [state.history]);
    const nonReferenceHistory = useMemo(() => state.history.filter(item => !item.is_reference), [state.history]);

    /**
     * Fetches the entire history list. Filtering for tabs is done on the client-side.
     * @param search The search term to filter by project name on the backend.
     */
    const fetchHistory = useCallback(async (search: string) => {
        dispatch({ type: 'FETCH_START' });
        try {
            const historyData = await fetchHistoryAPI(search);
            dispatch({ type: 'FETCH_SUCCESS', payload: historyData });
        } catch (err: any) {
            dispatch({ type: 'FETCH_ERROR', payload: err.message });
        }
    }, []);

    useEffect(() => {
        fetchHistory(debouncedSearchTerm);
    }, [debouncedSearchTerm, fetchHistory]);

    const handleViewDetails = (record: EstimationHistory) => {
        dispatch({ type: 'OPEN_MODAL', payload: { mode: 'edit', record } });
    };

    const handleOpenNewReferenceModal = () => {
        const newRecord: EstimationHistory = {
            id: '', // No ID for a new record,
            project_id: null,
            source_project_id: null, // Manually created references have no source project
            function_name: '', // This will be filled in by the form
            feature_description: '',
            system_prompt: DEFAULT_SYSTEM_PROMPT, // Use a default prompt
            sub_tasks: [],
            cost: '0',
            is_reference: true,
            created_at: new Date(),
            description_vector: [],
        };
        dispatch({ type: 'OPEN_MODAL', payload: { mode: 'new', record: newRecord } });
    };

    const handleOpenCloneModal = (record: EstimationHistory) => {
        // Create a copy for cloning, append (Clone) to the name
        const clonedRecord = {
            ...record,
            function_name: `${record.function_name} (Clone)`,
        };
        dispatch({ type: 'OPEN_MODAL', payload: { mode: 'clone', record: clonedRecord } });
    };

    const handleCancelModal = () => {
        dispatch({ type: 'CLOSE_MODAL' });
    };

    const handleDelete = async (id: string) => {
        const originalHistory = [...state.history];
        dispatch({ type: 'DELETE_SUCCESS', payload: id }); // Optimistic update
        try {
            await deleteHistoryAPI(id);
        } catch (err: any) {
            dispatch({ type: 'FETCH_SUCCESS', payload: originalHistory }); // Revert on error
            dispatch({ type: 'SAVE_ERROR', payload: err.message });
        }
    };

    /**
     * Handles saving data from the modal for all modes (new, clone, edit).
     * It determines the correct API endpoint and method based on the state.modalMode.
     */
    const handleSave = async (record: EstimationHistory) => {
        if (!record) return;

        dispatch({ type: 'SAVE_START' });

        try {
            let response;
            const isNew = state.modalMode === 'new' || state.modalMode === 'clone';

            if (isNew) {
                response = await fetch('/api/history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId: null, // References are not tied to a project
                        sourceProjectId: state.modalMode === 'clone' ? record.project_id : null,
                        functionName: record.function_name,
                        featureDescription: record.feature_description,
                        systemPrompt: record.system_prompt,
                        subTasks: record.sub_tasks,
                        isReference: true,
                        cost: String(record.cost),
                    }),
                });
            } else {
                response = await fetch(`/api/history/${record.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        functionName: record.function_name,
                        featureDescription: record.feature_description,
                        subTasks: record.sub_tasks,
                        cost: String(record.cost),
                    }),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save data.');
            }

            const savedData = await response.json();
            dispatch(isNew ? { type: 'SAVE_SUCCESS', payload: savedData } : { type: 'UPDATE_SUCCESS', payload: savedData });
            handleCancelModal();
        } catch (err: any) {
            dispatch({ type: 'SAVE_ERROR', payload: err.message });
        }
    };

    const handleExportCSV = useCallback((dataToExport: EstimationHistory[]) => {
        if (dataToExport.length === 0) return;

        const formatDays = (days: number | string | null | undefined): string => {
            const num = parseFloat(String(days || '0'));
            // Check if the number is an integer
            if (num % 1 === 0) {
                return String(num);
            }
            // Otherwise, format to 2 decimal places
            return num.toFixed(2);
        };

        const headers = ['Task', 'Subtask', 'Estimated day'];
        const csvRows = [headers.join(',')];

        dataToExport.forEach(record => {
            // Add the main task row
            const mainTaskValues = [
                `"${record.function_name.replace(/"/g, '""')}"`,
                '', // Empty value for Subtask column
                formatDays(record.cost),
            ];
            csvRows.push(mainTaskValues.join(','));

            // Add rows for each sub-task
            if (record.sub_tasks && Array.isArray(record.sub_tasks)) {
                record.sub_tasks.forEach(subTask => {
                    const values = [
                        '-', // Placeholder for Task column
                        `"${(subTask['Sub-Task'] || '').replace(/"/g, '""')}"`,
                        formatDays(subTask.Days)
                    ];
                    csvRows.push(values.join(','));
                });
            }
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `estimation_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, []);

    return {
        ...state,
        referenceHistory,
        nonReferenceHistory,
        searchTerm,
        setSearchTerm,
        setSelectedRecord: (record: EstimationHistory | null) => dispatch({ type: 'SET_SELECTED_RECORD', payload: record }),
        handleViewDetails,
        handleCancelModal,
        handleDelete,
        handleOpenCloneModal,
        handleOpenNewReferenceModal,
        handleExportCSV,
        handleSave,
    };
};