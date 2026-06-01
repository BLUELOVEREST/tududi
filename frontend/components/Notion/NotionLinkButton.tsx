import React from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface NotionLinkButtonProps {
    url?: string | null;
    label?: string;
}

const NotionLinkButton: React.FC<NotionLinkButtonProps> = ({
    url,
    label = 'Notion',
}) => {
    if (!url) return null;

    return (
        <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800/60"
            title="Open in Notion"
        >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            <span>{label}</span>
        </a>
    );
};

export default NotionLinkButton;
