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
            'Complexity (1-5)': 3,
        },
        {
            'Sub-Task': 'UI Implementation',
            'Description': 'Implement the user profile page.\n- Add form fields.\n- Add save button.',
            'Complexity (1-5)': 5,
        },
    ];

    const mockCost = 0.0012345;

    it('should render null if subTasks array is empty', () => {
        const { container } = render(<ResultsTable subTasks={[]} cost={0} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('should render null if subTasks prop is not provided', () => {
        // @ts-ignore-next-line - Intentionally testing invalid prop for robustness
        const { container } = render(<ResultsTable subTasks={null} cost={0} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('should render the table with correct data, headers, and cost', () => {
        render(<ResultsTable subTasks={mockSubTasks} cost={mockCost} />);

        // 1. Check for the main heading
        expect(screen.getByRole('heading', { name: /Estimation Results/i })).toBeInTheDocument();

        // 2. Check for table headers (Antd renders them as simple text in `th` elements)
        expect(screen.getByText('Sub-Task')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Complexity (1-5)')).toBeInTheDocument();

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
        expect(multiLineDescription).toHaveTextContent('Implement the user profile page.- Add form fields.- Add save button.');

        // 5. Check for complexity values
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();

        // 6. Check for the total cost, correctly formatted
        expect(screen.getByText(/Total Estimated Cost:/i)).toBeInTheDocument();
        expect(screen.getByText(`$${mockCost.toFixed(6)}`)).toBeInTheDocument();
    });
});