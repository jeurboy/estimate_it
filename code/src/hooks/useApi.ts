'use client';

import { useState, useCallback, useRef } from 'react';
import { Modal } from 'antd';
import { useRouter } from 'next/navigation';

export const useApi = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use useRef to persist the flag across re-renders without causing them.
    const isModalOpenRef = useRef(false);

    const apiFetch = useCallback(async <T>(url: string, options?: RequestInit): Promise<T | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(url, options);

            if (response.status === 401 && !isModalOpenRef.current) {
                isModalOpenRef.current = true; // Set flag to true
                Modal.warning({
                    title: 'Session Expired',
                    content: 'Your session has expired. Please log in again to continue.',
                    okText: 'Go to Login',
                    onOk() {
                        isModalOpenRef.current = false; // Reset flag
                        router.push('/login');
                    },
                    // The modal won't be closable by clicking outside or pressing Esc
                    maskClosable: false,
                    keyboard: false,
                });
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
    }, [router]);

    return { apiFetch, loading, error, setError };
};