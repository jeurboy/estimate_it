import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatLog, { ChatMessage } from '@/components/ChatLog';

describe('ChatLog Component', () => {
    const mockMessages: ChatMessage[] = [
        { type: 'status', text: 'Starting estimation...' },
        { type: 'error', text: 'An error occurred.' },
    ];

    it('renders messages correctly', () => {
        render(<ChatLog messages={mockMessages} />);
        expect(screen.getByText('[STATUS] Starting estimation...')).toBeInTheDocument();
        expect(screen.getByText('[ERROR] An error occurred.')).toBeInTheDocument();
    });

    it('does not show "View Log" button when prompt and rawResponse are not provided', () => {
        render(<ChatLog messages={mockMessages} />);
        const viewLogButton = screen.queryByRole('button', { name: /view ai interaction log/i });
        expect(viewLogButton).not.toBeInTheDocument();
    });

    it('shows "View Log" button when prompt and rawResponse are provided', () => {
        render(<ChatLog messages={[]} prompt="Test Prompt" rawResponse="{}" />);
        const viewLogButton = screen.getByRole('button', { name: /view ai interaction log/i });
        expect(viewLogButton).toBeInTheDocument();
    });

    it('opens a modal with prompt and raw response when "View Log" button is clicked', () => {
        const mockPrompt = 'This is the system prompt.';
        const mockRawResponse = '{"key": "value"}';

        render(<ChatLog messages={[]} prompt={mockPrompt} rawResponse={mockRawResponse} />);

        // Modal should not be visible initially
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        // Click the button to open the modal
        const viewLogButton = screen.getByRole('button', { name: /view ai interaction log/i });
        fireEvent.click(viewLogButton);

        // Modal and its content should now be visible
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
        expect(screen.getByText('AI Interaction Log')).toBeInTheDocument();
        expect(screen.getByText('System Prompt Sent to AI')).toBeInTheDocument();
        expect(screen.getByText(mockPrompt)).toBeInTheDocument();
        expect(screen.getByText('Raw JSON Response from AI')).toBeInTheDocument();

        // Check for formatted JSON
        const formattedJson = JSON.stringify(JSON.parse(mockRawResponse), null, 2);
        expect(screen.getByText(formattedJson)).toBeInTheDocument();
    });

    it('gracefully handles non-JSON raw response in the modal', () => {
        const nonJsonResponse = 'This is not JSON.';
        render(<ChatLog messages={[]} prompt="Test" rawResponse={nonJsonResponse} />);
        fireEvent.click(screen.getByRole('button', { name: /view ai interaction log/i }));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(nonJsonResponse)).toBeInTheDocument();
    });
});
