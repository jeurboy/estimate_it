import { POST, GET } from './route';
import { getEmbedding } from '@/lib/services/embeddingService';
import { saveEstimation, listEstimations } from '@/lib/db/history';
import { NextRequest } from 'next/server';

// Mock services
jest.mock('@/lib/services/embeddingService');
jest.mock('@/lib/db/history');

const mockGetEmbedding = getEmbedding as jest.Mock;
const mockSaveEstimation = saveEstimation as jest.Mock;
const mockListEstimations = listEstimations as jest.Mock;

describe('/api/history API Endpoint', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST', () => {
        it('should save an estimation and return 201', async () => {
            const mockBody = {
                projectName: 'Test Project',
                featureDescription: 'Test Feature',
                systemPrompt: 'Test Prompt',
                subTasks: [],
                cost: 1.0,
                isReference: true,
            };
            const mockVector = [0.1, 0.2];
            const mockSavedRecord = { ...mockBody, id: 'uuid-1' };

            mockGetEmbedding.mockResolvedValue(mockVector);
            mockSaveEstimation.mockResolvedValue(mockSavedRecord);

            const request = new NextRequest('http://localhost/api/history', {
                method: 'POST',
                body: JSON.stringify(mockBody),
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(201);
            expect(responseBody).toEqual(mockSavedRecord);
            expect(mockGetEmbedding).toHaveBeenCalledWith(mockBody.featureDescription);
            expect(mockSaveEstimation).toHaveBeenCalledWith({
                ...mockBody,
                descriptionVector: mockVector,
            });
        });

        it('should return 400 for invalid body', async () => {
            const request = new NextRequest('http://localhost/api/history', {
                method: 'POST',
                body: JSON.stringify({ projectName: 'Incomplete' }),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
        });
    });

    describe('GET', () => {
        it('should return a list of history items', async () => {
            const mockHistory = [{ id: 'uuid-1', project_name: 'Project A' }];
            mockListEstimations.mockResolvedValue(mockHistory as any);

            const request = new NextRequest('http://localhost/api/history');
            const response = await GET(request);
            const responseBody = await response.json();

            expect(response.status).toBe(200);
            expect(responseBody).toEqual({ history: mockHistory });
            expect(mockListEstimations).toHaveBeenCalledWith(undefined);
        });

        it('should handle search query parameter', async () => {
            const mockHistory = [{ id: 'uuid-2', project_name: 'Searchable Project' }];
            mockListEstimations.mockResolvedValue(mockHistory as any);

            const request = new NextRequest('http://localhost/api/history?search=Searchable');
            const response = await GET(request);
            const responseBody = await response.json();

            expect(response.status).toBe(200);
            expect(responseBody).toEqual({ history: mockHistory });
            expect(mockListEstimations).toHaveBeenCalledWith('Searchable');
        });

        it('should return 500 if the database service fails', async () => {
            mockListEstimations.mockRejectedValue(new Error('DB Error'));

            const request = new NextRequest('http://localhost/api/history');
            const response = await GET(request);
            const responseBody = await response.json();

            expect(response.status).toBe(500);
            expect(responseBody.error).toContain('DB Error');
        });
    });
});