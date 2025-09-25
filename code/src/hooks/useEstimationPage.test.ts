import { renderHook, act, waitFor } from '@testing-library/react';
import useEstimationPage from './useEstimationPage';
import { EstimationHistory } from '@/lib/db/schema';

// Mock the global fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.Mock;

const mockEstimationResult = {
    estimation: {
        subTasks: [{ 'Sub-Task': 'Task 1', Description: 'Desc 1', Days: 1 }],
        cost: 123.45,
    },
    prompt: 'Test Prompt',
    rawResponse: '{}',
};

describe('useEstimationPage Hook', () => {
    beforeEach(() => {
        mockFetch.mockClear();
        localStorage.clear();
    });

    it('should correctly normalize subTasks with varied property names', async () => {
        const mockProjectName = 'Test Project';
        const mockPrompt = 'Test system prompt';
        const mockRawResponse = '{"subTasks": [], "cost": 0.0025}';
        const mockApiResponse = {
            estimation: {
                subTasks: [
                    { task: 'API Setup', description: 'Set up endpoints.', days: 2 },
                    { taskName: 'DB Schema', details: 'Design schema.', Days: 1.5 },
                    { name: 'UI Mockups', Description: 'Create mockups.', days: '3' },
                    { 'Sub-Task': 'Auth Flow', details: 'Implement JWT.', Days: 2.5 },
                    {}, // Test defaults
                ],
                cost: 0.0025,
            },
            prompt: mockPrompt,
            rawResponse: mockRawResponse,
        };

        // Mock find-similar call
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ similarProjects: [] }) });
        // Mock estimate call
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiResponse) });

        const { result } = renderHook(() => useEstimationPage());

        await act(async () => {
            await result.current.handleEstimate('Test feature description');
        });

        const expectedNormalizedSubTasks = [
            { 'Sub-Task': 'API Setup', Description: 'Set up endpoints.', Days: 2 },
            { 'Sub-Task': 'DB Schema', Description: 'Design schema.', Days: 1.5 },
            { 'Sub-Task': 'UI Mockups', Description: 'Create mockups.', Days: 3 },
            { 'Sub-Task': 'Auth Flow', Description: 'Implement JWT.', Days: 2.5 },
            { 'Sub-Task': 'N/A', Description: '', Days: 0 },
        ];

        expect(result.current.results?.subTasks).toEqual(expectedNormalizedSubTasks);
        expect(result.current.results?.cost).toBe(0.0025);
    });

    it('should handle API errors gracefully', async () => {
        // Mock find-similar call
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ similarProjects: [] }) });
        // Mock estimate call to fail
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({ error: 'Something went wrong' }),
        });

        const { result } = renderHook(() => useEstimationPage());

        await act(async () => {
            await result.current.handleEstimate('Test feature');
        });

        await waitFor(() => {
            expect(result.current.results).toBeNull();
            expect(result.current.isLoading).toBe(false);
            const errorMessages = result.current.messages.filter(m => m.type === 'error');
            expect(errorMessages.length).toBeGreaterThan(0);
            expect(errorMessages[0].text).toContain('Something went wrong');
        });
    });

    it('should call handleSaveToHistory with isReference=true', async () => {
        // 1. First, run an estimation to get some results to save
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ similarProjects: [] }) });
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockEstimationResult) });

        const { result } = renderHook(() => useEstimationPage());
        await act(async () => {
            await result.current.handleEstimate('A feature to save');
        });

        // 2. Now, mock the history save endpoint and call the save handler
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: '123' }) });

        await act(async () => {
            await result.current.handleSaveToHistory('My Saved Project', true);
        });

        // 3. Verify the fetch call to /api/history
        const lastFetchCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        expect(lastFetchCall[0]).toBe('/api/history');
        const body = JSON.parse(lastFetchCall[1].body);
        expect(body.projectName).toBe('My Saved Project');
        expect(body.isReference).toBe(true);
        expect(body.cost).toBe(123.45);
    });

    it('should call handleSaveToHistory with isReference=false', async () => {
        // 1. Run estimation
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ similarProjects: [] }) });
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockEstimationResult) });

        const { result } = renderHook(() => useEstimationPage());
        await act(async () => {
            await result.current.handleEstimate('Another feature');
        });

        // 2. Mock save endpoint and call handler
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: '456' }) });

        await act(async () => {
            await result.current.handleSaveToHistory('My Non-Reference Project', false);
        });

        // 3. Verify fetch call
        const lastFetchCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const body = JSON.parse(lastFetchCall[1].body);
        expect(body.projectName).toBe('My Non-Reference Project');
        expect(body.isReference).toBe(false);
    });

    it('should enhance the system prompt with similar projects', async () => {
        const similarProjects: Partial<EstimationHistory>[] = [
            { project_name: 'Similar A', feature_description: 'Desc A', sub_tasks: [], cost: 1 },
        ];
        // Mock find-similar to return projects
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ similarProjects }) });
        // Mock estimate call
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockEstimationResult) });

        const { result } = renderHook(() => useEstimationPage());
        await act(async () => {
            await result.current.handleEstimate('A new feature');
        });

        // Verify the prompt sent to /api/estimate was enhanced
        const estimateCall = mockFetch.mock.calls[1];
        expect(estimateCall[0]).toBe('/api/estimate');
        const body = JSON.parse(estimateCall[1].body);
        expect(body.systemPrompt).toContain('Here are some examples of past estimations.');
        expect(body.systemPrompt).toContain('Project Name: Similar A');
    });
});
