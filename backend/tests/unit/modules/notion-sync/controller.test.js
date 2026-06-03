'use strict';

describe('notion sync controller', () => {
    afterEach(() => {
        jest.resetModules();
        jest.restoreAllMocks();
    });

    it('returns public configuration errors without leaking env names', async () => {
        const service = require('../../../../modules/notion-sync/service');
        jest.spyOn(service, 'backfillNotionEvents').mockRejectedValue(
            Object.assign(new Error('EVENT_HUB_API_TOKEN is not configured.'), {
                statusCode: 503,
                publicMessage: 'Notion sync is not configured.',
            })
        );
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const controller = require('../../../../modules/notion-sync/controller');
        const req = { body: { limit: 200, dry_run: true } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await controller.backfill(req, res);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Notion sync is not configured.',
            response: undefined,
        });
    });
});
