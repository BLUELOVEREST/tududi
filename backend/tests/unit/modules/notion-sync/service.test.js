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

    it('calls tg-hub backfill with bearer token', async () => {
        process.env.TG_HUB_API_BASE_URL = 'http://tg-hub:8090/api';
        process.env.TG_HUB_API_TOKEN = 'api-token';
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
            'http://tg-hub:8090/api/sync/notion/backfill?limit=200&dry_run=true',
            {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer api-token',
                },
            }
        );
        expect(result.synced).toBe(2);
    });

    it('requires tg-hub API config', async () => {
        const {
            backfillNotionEvents,
        } = require('../../../../modules/notion-sync/service');

        await expect(backfillNotionEvents()).rejects.toMatchObject({
            message: 'TG_HUB_API_TOKEN is not configured.',
            publicMessage: 'Notion sync is not configured.',
            statusCode: 503,
        });
    });

    it('maps tg-hub server failures to bad gateway', async () => {
        process.env.TG_HUB_API_BASE_URL = 'http://tg-hub:8090/api';
        process.env.TG_HUB_API_TOKEN = 'api-token';
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
