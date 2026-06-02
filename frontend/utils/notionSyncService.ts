import { getApiPath } from '../config/paths';
import { getCsrfToken } from './csrfService';

export interface NotionBackfillResult {
    ok: boolean;
    total: number;
    synced: number;
    skipped: number;
    errors: Array<{ page_id?: string; error: string }>;
}

export const backfillNotionEvents = async ({
    limit = 200,
    dryRun = false,
}: {
    limit?: number;
    dryRun?: boolean;
} = {}): Promise<NotionBackfillResult> => {
    const response = await fetch(getApiPath('notion-sync/backfill'), {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': await getCsrfToken(),
        },
        body: JSON.stringify({
            limit,
            dry_run: dryRun,
        }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || 'Failed to sync Notion events.');
    }

    return data;
};
