import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SaveToHistoryForm from '@/components/SaveToHistoryForm';

describe('SaveToHistoryForm Component', () => {
    const mockOnSubmit = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the form with an input and a disabled button', () => {
        render(<SaveToHistoryForm onSubmit={mockOnSubmit} isLoading={false} />);
        expect(screen.getByText('Save Estimation to History')).toBeInTheDocument();
        expect(screen.getByPlaceholderText("e.g., 'User Profile V2 Feature'")).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save to history/i })).toBeDisabled();
        expect(screen.getByLabelText(/save as a reference/i)).toBeInTheDocument();
    });

    it('enables the button when text is entered', () => {
        render(<SaveToHistoryForm onSubmit={mockOnSubmit} isLoading={false} />);
        const input = screen.getByPlaceholderText("e.g., 'User Profile V2 Feature'");
        fireEvent.change(input, { target: { value: 'My New Project' } });
        expect(screen.getByRole('button', { name: /save to history/i })).toBeEnabled();
    });

    it('calls onSubmit with the project name and isReference=true by default', () => {
        render(<SaveToHistoryForm onSubmit={mockOnSubmit} isLoading={false} />);
        const input = screen.getByPlaceholderText("e.g., 'User Profile V2 Feature'");
        const button = screen.getByRole('button', { name: /save to history/i });

        fireEvent.change(input, { target: { value: 'My Project' } });
        fireEvent.click(button);

        expect(mockOnSubmit).toHaveBeenCalledWith('My Project', true);
    });

    it('calls onSubmit with isReference=false when the checkbox is unchecked', () => {
        render(<SaveToHistoryForm onSubmit={mockOnSubmit} isLoading={false} />);
        const input = screen.getByPlaceholderText("e.g., 'User Profile V2 Feature'");
        const button = screen.getByRole('button', { name: /save to history/i });
        const checkbox = screen.getByLabelText(/save as a reference/i);

        // Uncheck the box
        fireEvent.click(checkbox);

        fireEvent.change(input, { target: { value: 'Another Project' } });
        fireEvent.click(button);

        expect(mockOnSubmit).toHaveBeenCalledWith('Another Project', false);
    });

    it('disables the form when isLoading is true', () => {
        render(<SaveToHistoryForm onSubmit={mockOnSubmit} isLoading={true} />);
        expect(screen.getByPlaceholderText("e.g., 'User Profile V2 Feature'")).toBeDisabled();
        expect(screen.getByRole('button', { name: /save to history/i })).toBeDisabled();
        expect(screen.getByLabelText(/save as a reference/i)).toBeDisabled();
    });
});