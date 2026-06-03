'use strict';

describe('tgHubWebhookService', () => {
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

    it('posts an authenticated webhook when URL and token are configured', async () => {
        process.env.EVENT_HUB_WEBHOOK_URL = 'https://event-hub.example/webhooks';
        process.env.EVENT_HUB_WEBHOOK_TOKEN = 'secret';
        global.fetch.mockResolvedValue({ ok: true, status: 204 });

        const {
            emitTgHubWebhook,
        } = require('../../../../modules/webhooks/tgHubWebhookService');

        await emitTgHubWebhook({
            entityType: 'task',
            entityUid: 'task-uid',
            eventType: 'created',
            updatedAt: '2026-06-01T00:00:00.000Z',
            notionPageId: 'page-id',
        });

        expect(global.fetch).toHaveBeenCalledWith(
            'https://event-hub.example/webhooks',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer secret',
                },
                body: JSON.stringify({
                    source: 'tududi',
                    entity_type: 'task',
                    entity_uid: 'task-uid',
                    event_type: 'created',
                    updated_at: '2026-06-01T00:00:00.000Z',
                    notion_page_id: 'page-id',
                }),
            }
        );
    });

    it('skips sending when URL is not configured', async () => {
        delete process.env.EVENT_HUB_WEBHOOK_URL;
        process.env.EVENT_HUB_WEBHOOK_TOKEN = 'secret';

        const {
            emitTgHubWebhook,
        } = require('../../../../modules/webhooks/tgHubWebhookService');

        await emitTgHubWebhook({
            entityType: 'inbox_item',
            entityUid: 'inbox-uid',
            eventType: 'updated',
            updatedAt: '2026-06-01T00:00:00.000Z',
        });

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('logs but does not throw on fetch failures', async () => {
        process.env.EVENT_HUB_WEBHOOK_URL = 'https://event-hub.example/webhooks';
        global.fetch.mockRejectedValue(new Error('network down'));
        const consoleError = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        const {
            emitTgHubWebhook,
        } = require('../../../../modules/webhooks/tgHubWebhookService');

        await expect(
            emitTgHubWebhook({
                entityType: 'task',
                entityUid: 'task-uid',
                eventType: 'updated',
                updatedAt: '2026-06-01T00:00:00.000Z',
            })
        ).resolves.toBeUndefined();

        expect(consoleError).toHaveBeenCalled();
    });

    it('logs but does not throw on non-successful responses', async () => {
        process.env.EVENT_HUB_WEBHOOK_URL = 'https://event-hub.example/webhooks';
        global.fetch.mockResolvedValue({
            ok: false,
            status: 502,
            statusText: 'Bad Gateway',
        });
        const consoleError = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        const {
            emitTgHubWebhook,
        } = require('../../../../modules/webhooks/tgHubWebhookService');

        await expect(
            emitTgHubWebhook({
                entityType: 'task',
                entityUid: 'task-uid',
                eventType: 'updated',
                updatedAt: '2026-06-01T00:00:00.000Z',
            })
        ).resolves.toBeUndefined();

        expect(consoleError).toHaveBeenCalledWith(
            'event-hub webhook failed:',
            expect.objectContaining({
                status: 502,
                statusText: 'Bad Gateway',
            })
        );
    });
});
