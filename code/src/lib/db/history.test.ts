import { saveEstimation, findSimilarEstimations, listEstimations } from './history';
import { EstimationHistory } from './schema';

// Mock the postgres library
const mockSql = jest.fn();
jest.mock('postgres', () => jest.fn(() => mockSql));

// Mock the pgvector library
jest.mock('pgvector', () => ({
    toSql: jest.fn((vector) => `ARRAY[${vector.join(',')}]`),
}));

describe('Database History Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('saveEstimation', () => {
        it('should correctly insert a new estimation record with isReference=true', async () => {
            const data = {
                projectName: 'Test Project',
                featureDescription: 'A test feature',
                systemPrompt: 'A test prompt',
                subTasks: [],
                isReference: true,
                cost: 1.23,
                descriptionVector: [0.1, 0.2],
                projectId: 'test-project-id',
                sourceProjectId: 'test-source-project-id',
                functionName: 'testFunctionName'
            };
            const expectedRecord: EstimationHistory = { ...data, id: 'uuid-1', created_at: new Date(), is_reference: true, project_name: 'Test Project', feature_description: 'A test feature', system_prompt: 'A test prompt', sub_tasks: [], description_vector: [0.1, 0.2] };

            mockSql.mockResolvedValue([expectedRecord]);

            const result = await saveEstimation(data);

            expect(mockSql).toHaveBeenCalledTimes(1);
            // Check if the SQL query includes the is_reference field and value
            const query = mockSql.mock.calls[0][0].raw;
            expect(query).toContain('is_reference');
            expect(result).toEqual(expectedRecord);
        });
    });

    describe('findSimilarEstimations', () => {
        it('should query for similar estimations with "WHERE is_reference = TRUE"', async () => {
            const embedding = [0.3, 0.4];
            mockSql.mockResolvedValue([]); // Return an empty array for simplicity

            await findSimilarEstimations(embedding);

            expect(mockSql).toHaveBeenCalledTimes(1);
            const query = mockSql.mock.calls[0][0].raw;

            // Verify the key parts of the query
            expect(query).toContain('SELECT * FROM estimation_history');
            expect(query).toContain('WHERE is_reference = TRUE');
            expect(query).toContain('ORDER BY description_vector <=>');
            expect(query).toContain('LIMIT 3');
        });
    });

    describe('listEstimations', () => {
        it('should retrieve all estimations without a search term', async () => {
            mockSql.mockResolvedValue([]);

            await listEstimations();

            expect(mockSql).toHaveBeenCalledTimes(1);
            const query = mockSql.mock.calls[0][0].raw;
            expect(query).toContain('SELECT * FROM estimation_history ORDER BY created_at DESC');
            // Ensure it does NOT contain the is_reference filter
            expect(query).not.toContain('WHERE is_reference');
        });

        it('should retrieve estimations with a search term', async () => {
            const searchTerm = 'ProjectX';
            mockSql.mockResolvedValue([]);

            await listEstimations(searchTerm);

            expect(mockSql).toHaveBeenCalledTimes(1);
            const query = mockSql.mock.calls[0][0].raw;
            expect(query).toContain('WHERE project_name ILIKE');
            expect(query).not.toContain('WHERE is_reference');
        });
    });

    it('should throw an error if the database call fails', async () => {
        const dbError = new Error('Database connection failed');
        mockSql.mockRejectedValue(dbError);

        await expect(saveEstimation({} as any)).rejects.toThrow('Failed to save estimation to the database.');
        await expect(findSimilarEstimations([])).rejects.toThrow('Failed to find similar estimations in the database.');
        await expect(listEstimations()).rejects.toThrow('Failed to retrieve estimations from the database.');
    });
});