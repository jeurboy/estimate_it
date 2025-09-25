import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { useHistoryPage } from '@/hooks/useHistoryPage';
import HistoryPage from './page'; // The component being tested

// Mock the custom hook
jest.mock('@/hooks/useHistoryPage');

const mockUseHistoryPage = useHistoryPage as jest.Mock;

describe('HistoryPage', () => {
    const mockHandleViewDetails = jest.fn();
    const mockHandleDelete = jest.fn();
    const mockHandleCloneToReference = jest.fn();
    const mockHandleOpenCloneModal = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('fetches and displays history records on load', async () => {
        const mockHistory = [
            {
                id: '1',
                project_name: 'Project Alpha',
                is_reference: true,
                cost: 1.23,
                created_at: new Date().toISOString(),
            },
            {
                id: '2',
                project_name: 'Project Beta',
                is_reference: false,
                cost: 4.56,
                created_at: new Date().toISOString(),
            }
        ];

        mockUseHistoryPage.mockReturnValue({
            history: mockHistory,
            nonReferenceHistory: mockHistory.filter(h => !h.is_reference),
            referenceHistory: mockHistory.filter(h => h.is_reference),
            loading: false,
            error: null,
            modalMode: null,
            setSearchTerm: jest.fn(),
            handleViewDetails: mockHandleViewDetails,
            handleDelete: mockHandleDelete,
        });

        render(<HistoryPage />);

        // Check if tabs are rendered
        expect(screen.getByText('History (1)')).toBeInTheDocument();
        expect(screen.getByText('References (1)')).toBeInTheDocument();
        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(screen.getByText('$1.230000')).toBeInTheDocument();
    });

    it('calls setSearchTerm on search input change', async () => {
        const mockSetSearchTerm = jest.fn();
        mockUseHistoryPage.mockReturnValue({
            history: [],
            nonReferenceHistory: [],
            referenceHistory: [],
            loading: false,
            error: null,
            modalMode: null,
            setSearchTerm: mockSetSearchTerm,
        });

        render(<HistoryPage />);

        const searchInput = screen.getByPlaceholderText('Search by project name...');
        fireEvent.change(searchInput, { target: { value: 'Test Search' } });

        expect(mockSetSearchTerm).toHaveBeenCalledWith('Test Search');
    });

    it('calls handleViewDetails when "View Details" is clicked', async () => {
        const mockRecord = { id: '1', project_name: 'Project Gamma' };
        mockUseHistoryPage.mockReturnValue({
            history: [mockRecord],
            nonReferenceHistory: [mockRecord],
            referenceHistory: [],
            loading: false,
            error: null,
            modalMode: null,
            handleViewDetails: mockHandleViewDetails,
        });

        render(<HistoryPage />);

        const viewButton = await screen.findByText('View Details');
        fireEvent.click(viewButton);

        expect(mockHandleViewDetails).toHaveBeenCalledWith(mockRecord);
    });

    it('should handle cloning to reference via the modal', async () => {
        const mockRecordToClone = {
            id: 'hist-1',
            project_name: 'Original Project',
            feature_description: 'Original Desc',
            sub_tasks: [],
            cost: 10,
            is_reference: false,
            created_at: new Date(),
            system_prompt: 'prompt',
            description_vector: []
        };

        // This is the state of the hook when the clone modal is open
        mockUseHistoryPage.mockReturnValue({
            history: [mockRecordToClone],
            nonReferenceHistory: [mockRecordToClone],
            referenceHistory: [],
            loading: false,
            isSaving: false,
            error: null,
            modalMode: 'clone',
            isModalVisible: true,
            selectedRecord: { // The record prepared for cloning
                ...mockRecordToClone,
                project_name: 'Original Project (Clone)',
            },
            handleCloneToReference: mockHandleCloneToReference,
            // Provide other handlers as empty functions
            setSearchTerm: jest.fn(),
            setSelectedRecord: jest.fn(),
            handleViewDetails: jest.fn(),
            handleCancelModal: jest.fn(),
            handleDelete: jest.fn(),
            handleOpenCloneModal: jest.fn(),
            handleSaveModalChanges: jest.fn(),
        });

        render(<HistoryPage />);

        // Check that the modal is open with the correct title and pre-filled, modified name
        expect(screen.getByText('Clone to Reference: Original Project (Clone)')).toBeInTheDocument();
        const nameInput = screen.getByLabelText('Function Name');
        expect(nameInput).toHaveValue('Original Project (Clone)');
    });
});