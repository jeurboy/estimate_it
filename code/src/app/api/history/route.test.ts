import { POST, GET } from './route';
import { getEmbedding } from '@/lib/services/embeddingService';
import { saveEstimation, listEstimations } from '@/lib/db/history';
import { NextRequest } from 'next/server';
import { EstimationHistory } from '@/lib/db/schema';

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
                projectId: 'proj-123',
                sourceProjectId: null,
                functionName: 'Test Function',
                featureDescription: 'Test Feature',
                systemPrompt: 'Test Prompt',
                subTasks: [],
                cost: 1.0, // The API receives a number
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
                projectId: mockBody.projectId,
                sourceProjectId: mockBody.sourceProjectId,
                functionName: mockBody.functionName,
                featureDescription: mockBody.featureDescription,
                systemPrompt: mockBody.systemPrompt,
                subTasks: mockBody.subTasks,
                cost: String(mockBody.cost), // The DB service receives a string
                isReference: mockBody.isReference,
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
            const mockHistory: EstimationHistory[] = [{
                id: 'uuid-1',
                project_id: 'proj-1',
                source_project_id: null,
                function_name: 'Function A',
                feature_description: 'Desc A',
                system_prompt: 'Prompt A',
                sub_tasks: [],
                cost: '5.00',
                is_reference: false,
                description_vector: [0.1],
                created_at: new Date(),
            }];
            mockListEstimations.mockResolvedValue(mockHistory);

            const request = new NextRequest('http://localhost/api/history');
            const response = await GET(request);
            const responseBody = await response.json();

            expect(response.status).toBe(200);
            expect(responseBody).toEqual({ history: mockHistory });
            expect(mockListEstimations).toHaveBeenCalledWith(undefined);
        });

        it('should handle search query parameter', async () => {
            const mockHistory: EstimationHistory[] = [{
                id: 'uuid-2',
                project_id: 'proj-2',
                source_project_id: null,
                function_name: 'Searchable Function',
                feature_description: 'Desc B',
                system_prompt: 'Prompt B',
                sub_tasks: [],
                cost: '10.00',
                is_reference: false,
                description_vector: [0.2],
                created_at: new Date(),
            }];
            mockListEstimations.mockResolvedValue(mockHistory);

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