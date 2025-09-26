import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsTable from '@/components/ResultsTable';
import { SubTask } from '@/lib/services/geminiService';

describe('ResultsTable', () => {
    const mockSubTasks: SubTask[] = [
        {
            'Sub-Task': 'API Design',
            'Description': 'Design the API endpoints for user management.',
            'Days': 3,
        },
        {
            'Sub-Task': 'UI Implementation',
            'Description': 'Implement the user profile page.\n- Add form fields.\n- Add save button.',
            'Days': 5,
        },
    ];

    const mockCost = 8;

    it('should render null if subTasks array is empty', () => {
        const { container } = render(<ResultsTable subTasks={[]} cost={0} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('should render null if subTasks prop is not provided', () => {
        // @ts-expect-error - Intentionally testing invalid prop for robustness
        const { container } = render(<ResultsTable subTasks={null} cost={0} onSubTasksChange={() => { }} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('should render the table with correct data, headers, and cost', () => {
        render(<ResultsTable subTasks={mockSubTasks} cost={mockCost} />);

        // 1. Check for the main heading
        expect(screen.getByRole('heading', { name: /Estimation Results/i })).toBeInTheDocument();

        // 2. Check for table headers (Antd renders them as simple text in `th` elements)
        expect(screen.getByText('Sub-Task')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Days')).toBeInTheDocument();

        // 3. Check for the content of the first task
        expect(screen.getByText('API Design')).toBeInTheDocument();
        expect(screen.getByText('Design the API endpoints for user management.')).toBeInTheDocument();

        // 4. Check for the content of the second task (with multi-line description)
        expect(screen.getByText('UI Implementation')).toBeInTheDocument();
        const multiLineDescription = screen.getByText(/Implement the user profile page/);
        expect(multiLineDescription).toBeInTheDocument();
        // Verify that the class responsible for rendering newlines is present
        expect(multiLineDescription).toHaveClass('whitespace-pre-line');
        // The text content gets normalized by testing-library, so we check for the concatenated content
        expect(multiLineDescription).toHaveTextContent('Implement the user profile page.\n- Add form fields.\n- Add save button.');

        // 5. Check for Days values
        expect(screen.getByText('3.00')).toBeInTheDocument();
        expect(screen.getByText('5.00')).toBeInTheDocument();

        // 6. Check for the total estimated days, correctly formatted
        expect(screen.getByText(/Total Estimated Days:/i)).toBeInTheDocument();
        expect(screen.getByText(`${mockCost.toFixed(2)} days`)).toBeInTheDocument();
    });
});