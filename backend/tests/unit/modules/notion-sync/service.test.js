'use strict';

describe('notion sync service', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        global.fetch = jest.fn();
        jest.resetModules();
    });

    afterEach(() => {
        process.env = originalEnv;
        delete global.fetch;
        jest.restoreAllMocks();
    });

    it('calls event-hub backfill with bearer token', async () => {
        process.env.EVENT_HUB_API_BASE_URL = 'http://event-hub:8090/api';
        process.env.EVENT_HUB_API_TOKEN = 'api-token';
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                ok: true,
                total: 19,
                synced: 2,
                skipped: 17,
                errors: [],
            }),
        });

        const {
            backfillNotionEvents,
        } = require('../../../../modules/notion-sync/service');

        const result = await backfillNotionEvents({
            limit: 200,
            dryRun: true,
        });

        expect(global.fetch).toHaveBeenCalledWith(
            'http://event-hub:8090/api/sync/notion/backfill?limit=200&dry_run=true',
            {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer api-token',
                },
            }
        );
        expect(result.synced).toBe(2);
    });

    it('passes force update to event-hub backfill', async () => {
        process.env.EVENT_HUB_API_BASE_URL = 'http://event-hub:8090/api';
        process.env.EVENT_HUB_API_TOKEN = 'api-token';
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                ok: true,
                total: 19,
                synced: 19,
                skipped: 0,
                errors: [],
            }),
        });

        const {
            backfillNotionEvents,
        } = require('../../../../modules/notion-sync/service');

        await backfillNotionEvents({
            limit: 200,
            forceUpdate: true,
        });

        expect(global.fetch).toHaveBeenCalledWith(
            'http://event-hub:8090/api/sync/notion/backfill?limit=200&force_update=true',
            {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer api-token',
                },
            }
        );
    });

    it('calls event-hub diff with bearer token', async () => {
        process.env.EVENT_HUB_API_BASE_URL = 'http://event-hub:8090/api';
        process.env.EVENT_HUB_API_TOKEN = 'api-token';
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                ok: true,
                missing_in_tududi: 3,
                missing_in_notion: 1,
                failed: 2,
            }),
        });

        const { diffSyncRecords } = require('../../../../modules/notion-sync/service');

        const result = await diffSyncRecords({ limit: 200 });

        expect(global.fetch).toHaveBeenCalledWith(
            'http://event-hub:8090/api/sync/diff?limit=200',
            {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer api-token',
                },
            }
        );
        expect(result.missing_in_tududi).toBe(3);
    });

    it('calls event-hub push with bearer token', async () => {
        process.env.EVENT_HUB_API_BASE_URL = 'http://event-hub:8090/api';
        process.env.EVENT_HUB_API_TOKEN = 'api-token';
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                ok: true,
                total: 2,
                synced: 2,
                skipped: 0,
                errors: [],
            }),
        });

        const { pushTududiRecords } = require('../../../../modules/notion-sync/service');

        const result = await pushTududiRecords({ limit: 200 });

        expect(global.fetch).toHaveBeenCalledWith(
            'http://event-hub:8090/api/sync/tududi/push?limit=200',
            {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer api-token',
                },
            }
        );
        expect(result.synced).toBe(2);
    });

    it('calls event-hub retry with bearer token', async () => {
        process.env.EVENT_HUB_API_BASE_URL = 'http://event-hub:8090/api';
        process.env.EVENT_HUB_API_TOKEN = 'api-token';
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true }),
        });

        const { retryFailedRecords } = require('../../../../modules/notion-sync/service');

        const result = await retryFailedRecords();

        expect(global.fetch).toHaveBeenCalledWith(
            'http://event-hub:8090/api/sync/retry',
            {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer api-token',
                },
            }
        );
        expect(result.ok).toBe(true);
    });

    it('requires event-hub API config', async () => {
        const {
            backfillNotionEvents,
        } = require('../../../../modules/notion-sync/service');

        await expect(backfillNotionEvents()).rejects.toMatchObject({
            message: 'EVENT_HUB_API_TOKEN is not configured.',
            publicMessage: 'Notion sync is not configured.',
            statusCode: 503,
        });
    });

    it('maps event-hub server failures to bad gateway', async () => {
        process.env.EVENT_HUB_API_BASE_URL = 'http://event-hub:8090/api';
        process.env.EVENT_HUB_API_TOKEN = 'api-token';
        global.fetch.mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({ detail: 'upstream failed' }),
        });

        const {
            backfillNotionEvents,
        } = require('../../../../modules/notion-sync/service');

        await expect(backfillNotionEvents()).rejects.toMatchObject({
            message: 'upstream failed',
            statusCode: 502,
        });
    });
});
