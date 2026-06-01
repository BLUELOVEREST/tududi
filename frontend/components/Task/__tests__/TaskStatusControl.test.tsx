import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskStatusControl from '../TaskStatusControl';
import { Task } from '../../../entities/Task';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

const baseTask: Task = {
    id: 1,
    uid: 'task-1',
    name: 'Task with Notion link',
    status: 'planned',
    completed_at: null,
};

describe('TaskStatusControl', () => {
    it('shows workflow status options without legacy not started', () => {
        render(
            <TaskStatusControl task={baseTask} showMobileVariant={false} />
        );

        expect(screen.getByRole('button', { name: 'Planned' })).toHaveAttribute(
            'title',
            'Planned'
        );

        const menuButton = screen.getByRole('button', { expanded: false });
        fireEvent.click(menuButton);
        const menu = menuButton.parentElement?.nextElementSibling as HTMLElement;

        expect(
            within(menu).queryByRole('button', { name: 'Not started' })
        ).not.toBeInTheDocument();
        expect(
            within(menu).getByRole('button', { name: 'Planned' })
        ).toBeInTheDocument();
        expect(
            within(menu).getByRole('button', { name: 'Building' })
        ).toBeInTheDocument();
        expect(
            within(menu).getByRole('button', { name: 'Validating' })
        ).toBeInTheDocument();
        expect(
            within(menu).getByRole('button', { name: 'Optimizing' })
        ).toBeInTheDocument();
        expect(
            within(menu).getByRole('button', { name: 'Paused' })
        ).toBeInTheDocument();
        expect(
            within(menu).getByRole('button', { name: 'Cancelled' })
        ).toBeInTheDocument();
        expect(
            within(menu).getByRole('button', { name: 'Done' })
        ).toBeInTheDocument();
    });

    it('renders a Notion quick action without bubbling row clicks', () => {
        const rowClick = jest.fn();

        render(
            <div onClick={rowClick}>
                <TaskStatusControl
                    task={{
                        ...baseTask,
                        notion_url: 'https://www.notion.so/example-task',
                    }}
                    showNotionQuickAction
                    showMobileVariant={false}
                />
            </div>
        );

        const notionLink = screen.getByRole('link', {
            name: 'Open in Notion',
        });

        expect(notionLink).toHaveAttribute(
            'href',
            'https://www.notion.so/example-task'
        );

        fireEvent.click(notionLink);

        expect(rowClick).not.toHaveBeenCalled();
    });
});
