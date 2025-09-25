import { POST } from '@/app/api/estimate/route';
import { getPromptFromSheet } from '@/lib/services/sheetsService';
import { estimateFeature } from '@/lib/services/geminiService';
import { NextRequest } from 'next/server';

// Mock the services
jest.mock('@/lib/services/sheetsService');
jest.mock('@/lib/services/geminiService');

const mockedGetPromptFromSheet = getPromptFromSheet as jest.Mock;
const mockedEstimateFeature = estimateFeature as jest.Mock;

describe('API Route: /api/estimate', () => {
    const validBody = {
        featureDescription: 'A new feature',
        googleSheetUrl: 'https://docs.google.com/spreadsheets/d/test-id',
        geminiApiKey: 'test-gemini-key',
        googleApiKey: 'test-google-key',
    };

    beforeEach(() => {
        // Reset mocks before each test
        mockedGetPromptFromSheet.mockReset();
        mockedEstimateFeature.mockReset();
    });

    it('should return 200 OK with an estimation for a valid request', async () => {
        // Arrange
        const mockEstimation = {
            subTasks: [{ 'Sub-Task': 'Test', Description: 'Test desc', 'Complexity (1-5)': 3 }],
            cost: 0.01,
            rawResponse: '{}',
        };
        mockedGetPromptFromSheet.mockResolvedValue('Test prompt');
        mockedEstimateFeature.mockResolvedValue(mockEstimation);

        const request = new NextRequest('http://localhost/api/estimate', {
            method: 'POST',
            body: JSON.stringify(validBody),
        });

        // Act
        const response = await POST(request);
        const responseBody = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(responseBody).toEqual(mockEstimation);
        expect(mockedGetPromptFromSheet).toHaveBeenCalledWith(validBody.googleSheetUrl, validBody.googleApiKey);
        expect(mockedEstimateFeature).toHaveBeenCalledWith(validBody.geminiApiKey, 'Test prompt', validBody.featureDescription);
    });

    it.each([
        ['featureDescription', { ...validBody, featureDescription: '' }],
        ['googleSheetUrl', { ...validBody, googleSheetUrl: '' }],
        ['geminiApiKey', { ...validBody, geminiApiKey: '' }],
        ['googleApiKey', { ...validBody, googleApiKey: '' }],
    ])('should return 400 Bad Request if %s is missing', async (fieldName, body) => {
        // Arrange
        const request = new NextRequest('http://localhost/api/estimate', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        // Act
        const response = await POST(request);
        const responseBody = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(responseBody.error).toContain('is required');
    });

    it('should return 500 Internal Server Error if getPromptFromSheet fails', async () => {
        // Arrange
        const errorMessage = 'Failed to access Google Sheet.';
        mockedGetPromptFromSheet.mockRejectedValue(new Error(errorMessage));
        const request = new NextRequest('http://localhost/api/estimate', {
            method: 'POST',
            body: JSON.stringify(validBody),
        });

        // Act
        const response = await POST(request);
        const responseBody = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(responseBody.error).toBe(errorMessage);
    });

    it('should return 500 Internal Server Error if estimateFeature fails', async () => {
        // Arrange
        const errorMessage = 'Gemini API key is invalid.';
        mockedGetPromptFromSheet.mockResolvedValue('Test prompt');
        mockedEstimateFeature.mockRejectedValue(new Error(errorMessage));
        const request = new NextRequest('http://localhost/api/estimate', {
            method: 'POST',
            body: JSON.stringify(validBody),
        });

        // Act
        const response = await POST(request);
        const responseBody = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(responseBody.error).toBe(errorMessage);
    });
});