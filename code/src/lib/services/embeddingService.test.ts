import { getEmbedding } from '@/lib/services/embeddingService';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the GoogleGenerativeAI library
jest.mock('@google/generative-ai', () => {
    const mockEmbedContent = jest.fn();
    const mockGetGenerativeModel = jest.fn(() => ({
        embedContent: mockEmbedContent,
    }));
    return {
        GoogleGenerativeAI: jest.fn(() => ({
            getGenerativeModel: mockGetGenerativeModel,
        })),
    };
});

// Get a reference to the mock function to check calls and set return values
const mockEmbedContent = new GoogleGenerativeAI('test-key').getGenerativeModel({ model: '' }).embedContent as jest.Mock;

describe('Embedding Service - getEmbedding', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GEMINI_API_KEY = 'test-key';
    });

    it('should return embedding values on successful API call', async () => {
        const mockEmbedding = { values: [0.1, 0.2, 0.3] };
        mockEmbedContent.mockResolvedValue({ embedding: mockEmbedding });

        const text = 'test input';
        const result = await getEmbedding(text);

        expect(mockEmbedContent).toHaveBeenCalledWith(text);
        expect(result).toEqual(mockEmbedding.values);
    });

    it('should throw an error if the API call fails', async () => {
        mockEmbedContent.mockRejectedValue(new Error('API Error'));

        await expect(getEmbedding('test input')).rejects.toThrow('Failed to generate text embedding: API Error');
    });

    it('should throw an error if the embedding values are missing', async () => {
        mockEmbedContent.mockResolvedValue({ embedding: {} }); // No values property

        await expect(getEmbedding('test input')).rejects.toThrow('Failed to generate embedding: No values returned from the model.');
    });
});