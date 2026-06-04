'use strict';

const buildEventHubUrl = (path, params = {}) => {
    const baseUrl = process.env.EVENT_HUB_API_BASE_URL;
    if (!baseUrl) {
        const error = new Error('EVENT_HUB_API_BASE_URL is not configured.');
        error.statusCode = 503;
        error.publicMessage = 'Notion sync is not configured.';
        throw error;
    }

    const url = new URL(`${baseUrl.replace(/\/$/, '')}${path}`);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== false) {
            url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
};

async function callEventHub(path, { limit, dryRun } = {}) {
    const token = process.env.EVENT_HUB_API_TOKEN;
    if (!token) {
        const error = new Error('EVENT_HUB_API_TOKEN is not configured.');
        error.statusCode = 503;
        error.publicMessage = 'Notion sync is not configured.';
        throw error;
    }

    const params = {};
    if (limit !== undefined) {
        params.limit = Math.min(Math.max(Number(limit) || 200, 1), 500);
    }
    if (dryRun) {
        params.dry_run = 'true';
    }
    const url = buildEventHubUrl(path, params);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    let body = null;
    try {
        body = await response.json();
    } catch {
        body = null;
    }

    if (!response.ok) {
        const error = new Error(
            body?.detail || body?.error || 'event-hub Notion backfill failed.'
        );
        error.statusCode = response.status >= 500 ? 502 : response.status;
        error.response = body;
        throw error;
    }

    return body;
}

async function backfillNotionEvents({ limit = 200, dryRun = false } = {}) {
    return callEventHub('/sync/notion/backfill', { limit, dryRun });
}

async function diffSyncRecords({ limit = 200 } = {}) {
    return callEventHub('/sync/diff', { limit });
}

async function pushTududiRecords({ limit = 200 } = {}) {
    return callEventHub('/sync/tududi/push', { limit });
}

async function retryFailedRecords() {
    return callEventHub('/sync/retry');
}

module.exports = {
    backfillNotionEvents,
    diffSyncRecords,
    pushTududiRecords,
    retryFailedRecords,
};
