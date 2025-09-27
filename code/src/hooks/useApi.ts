'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useApi = () => {
    const { showSessionExpiredModal } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apiFetch = useCallback(async <T>(url: string, options?: RequestInit): Promise<T | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(url, options);

            if (response.status === 401) {
                showSessionExpiredModal();
                return null; // Stop further processing
            }

            if (!response.ok) {
                // Try to parse error message from the response body
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Request failed with status ${response.status}`);
                } catch {
                    throw new Error(`Request failed with status ${response.status}`);
                }
            }

            // For 204 No Content, return null as there's no body to parse.
            if (response.status === 204) {
                return null;
            }

            return await response.json() as T;

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'A network error occurred.';
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [showSessionExpiredModal]);

    return { apiFetch, loading, error, setError };
};