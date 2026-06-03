'use strict';

const buildBackfillUrl = ({ limit, dryRun }) => {
    const baseUrl = process.env.EVENT_HUB_API_BASE_URL;
    if (!baseUrl) {
        const error = new Error('EVENT_HUB_API_BASE_URL is not configured.');
        error.statusCode = 503;
        error.publicMessage = 'Notion sync is not configured.';
        throw error;
    }

    const url = new URL(`${baseUrl.replace(/\/$/, '')}/sync/notion/backfill`);
    url.searchParams.set('limit', String(limit));
    if (dryRun) {
        url.searchParams.set('dry_run', 'true');
    }
    return url.toString();
};

async function backfillNotionEvents({ limit = 200, dryRun = false } = {}) {
    const token = process.env.EVENT_HUB_API_TOKEN;
    if (!token) {
        const error = new Error('EVENT_HUB_API_TOKEN is not configured.');
        error.statusCode = 503;
        error.publicMessage = 'Notion sync is not configured.';
        throw error;
    }

    const boundedLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
    const url = buildBackfillUrl({ limit: boundedLimit, dryRun: !!dryRun });

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

module.exports = {
    backfillNotionEvents,
};
