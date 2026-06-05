import { getApiPath } from '../config/paths';
import { getCsrfToken } from './csrfService';

export interface NotionBackfillResult {
    ok: boolean;
    total: number;
    synced: number;
    skipped: number;
    errors: Array<{ page_id?: string; error: string }>;
}

export interface NotionSyncDiffResult {
    ok: boolean;
    notion_total: number;
    tududi_inbox_total: number;
    tududi_task_total: number;
    missing_in_tududi: number;
    missing_in_notion: number;
    failed: number;
}

const postNotionSync = async <T>(
    path: string,
    body: Record<string, unknown> = {}
): Promise<T> => {
    const response = await fetch(getApiPath(path), {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': await getCsrfToken(),
        },
        body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || 'Failed to sync Notion events.');
    }

    return data;
};

export const backfillNotionEvents = async ({
    limit = 200,
    dryRun = false,
    forceUpdate = false,
}: {
    limit?: number;
    dryRun?: boolean;
    forceUpdate?: boolean;
} = {}): Promise<NotionBackfillResult> => {
    return postNotionSync<NotionBackfillResult>('notion-sync/backfill', {
        limit,
        dry_run: dryRun,
        force_update: forceUpdate,
    });
};

export const diffNotionSyncRecords = async ({
    limit = 200,
}: {
    limit?: number;
} = {}): Promise<NotionSyncDiffResult> =>
    postNotionSync<NotionSyncDiffResult>('notion-sync/diff', { limit });

export const pushTududiRecordsToNotion = async ({
    limit = 200,
}: {
    limit?: number;
} = {}): Promise<NotionBackfillResult> =>
    postNotionSync<NotionBackfillResult>('notion-sync/push', { limit });

export const retryFailedNotionSync = async (): Promise<{ ok: boolean }> =>
    postNotionSync<{ ok: boolean }>('notion-sync/retry');
