const request = require('supertest');

jest.mock('../../modules/webhooks/tgHubWebhookService', () => ({
    emitTgHubWebhook: jest.fn(),
}));

const app = require('../../app');
const { InboxItem, Task, User } = require('../../models');
const { createTestUser } = require('../helpers/testUtils');
const {
    emitTgHubWebhook,
} = require('../../modules/webhooks/tgHubWebhookService');

describe('Inbox Routes', () => {
    let user, agent;

    beforeEach(async () => {
        emitTgHubWebhook.mockClear();

        user = await createTestUser({
            email: 'test@example.com',
        });

        // Create authenticated agent
        agent = request.agent(app);
        await agent.post('/api/login').send({
            email: 'test@example.com',
            password: 'password123',
        });
    });

    describe('POST /api/inbox', () => {
        it('should create a new inbox item', async () => {
            const inboxData = {
                content: 'Remember to buy groceries',
                brief: 'Use the shared family list before the weekend.',
                source: 'web',
                priority: 'high',
            };

            const response = await agent.post('/api/inbox').send(inboxData);

            expect(response.status).toBe(201);
            expect(response.body.content).toBe(inboxData.content);
            expect(response.body.brief).toBe(inboxData.brief);
            expect(response.body.source).toBe(inboxData.source);
            expect(response.body.status).toBe('added');
            expect(response.body.priority).toBe(2);
            expect(response.body.uid).toBeDefined();
            expect(typeof response.body.uid).toBe('string');
            expect(emitTgHubWebhook).toHaveBeenCalledWith({
                entityType: 'inbox_item',
                entityUid: response.body.uid,
                eventType: 'created',
                updatedAt: expect.any(String),
            });
        });

        it('should skip webhook when create comes from event-hub sync', async () => {
            const response = await agent
                .post('/api/inbox')
                .set('X-Sync-Origin', 'event-hub')
                .send({
                    content: 'Created from Notion',
                    source: 'notion',
                });

            expect(response.status).toBe(201);
            expect(response.body.content).toBe('Created from Notion');
            expect(emitTgHubWebhook).not.toHaveBeenCalled();
        });

        it('should require authentication', async () => {
            const inboxData = {
                content: 'Test content',
            };

            const response = await request(app)
                .post('/api/inbox')
                .send(inboxData);

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authentication required');
        });

        it('should require content', async () => {
            const inboxData = {};

            const response = await agent.post('/api/inbox').send(inboxData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Content is required');
        });
    });

    describe('GET /api/inbox', () => {
        let inboxItem1, inboxItem2;

        beforeEach(async () => {
            inboxItem1 = await InboxItem.create({
                content: 'First item',
                status: 'added',
                source: 'test',
                user_id: user.id,
                notion_last_edited_time: new Date('2026-06-01T00:00:01.000Z'),
            });

            inboxItem2 = await InboxItem.create({
                content: 'Second item',
                status: 'processed',
                source: 'test',
                user_id: user.id,
            });
        });

        it('should get all user inbox items', async () => {
            const response = await agent.get('/api/inbox');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1); // Only items with status 'added' are returned
            expect(response.body.map((i) => i.uid)).toContain(inboxItem1.uid);
        });

        it('should only return items with added status', async () => {
            const response = await agent.get('/api/inbox');

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].uid).toBe(inboxItem1.uid);
            expect(response.body[0].status).toBe('added');
            expect(response.body[0].notion_last_edited_time).toBe(
                '2026-06-01T00:00:01.000Z'
            );
        });

        it('should filter inbox items by Notion page id regardless of status', async () => {
            await inboxItem1.update({ notion_page_id: 'page-id-1' });
            await inboxItem2.update({ notion_page_id: 'page-id-2' });

            const response = await agent.get(
                '/api/inbox?notion_page_id=page-id-2'
            );

            expect(response.status).toBe(200);
            expect(response.body.map((item) => item.uid)).toEqual([
                inboxItem2.uid,
            ]);
        });

        it('should filter inbox items by Notion sync status regardless of status', async () => {
            await inboxItem1.update({ notion_sync_status: 'synced' });
            await inboxItem2.update({ notion_sync_status: 'error' });

            const response = await agent.get(
                '/api/inbox?notion_sync_status=error'
            );

            expect(response.status).toBe(200);
            expect(response.body.map((item) => item.uid)).toEqual([
                inboxItem2.uid,
            ]);
        });

        it('should return inbox items ordered by created_at DESC (newest first)', async () => {
            // Create additional items with slight delay to ensure different timestamps
            const item1 = await InboxItem.create({
                content: 'First item (oldest)',
                status: 'added',
                source: 'test',
                user_id: user.id,
            });

            // Small delay to ensure different timestamps
            await new Promise((resolve) => setTimeout(resolve, 10));

            const item2 = await InboxItem.create({
                content: 'Second item',
                status: 'added',
                source: 'test',
                user_id: user.id,
            });

            await new Promise((resolve) => setTimeout(resolve, 10));

            const item3 = await InboxItem.create({
                content: 'Third item (newest)',
                status: 'added',
                source: 'test',
                user_id: user.id,
            });

            const response = await agent.get('/api/inbox');

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(4); // Including the item from beforeEach

            // Check that items are ordered by newest first
            expect(response.body[0].uid).toBe(item3.uid);
            expect(response.body[1].uid).toBe(item2.uid);
            expect(response.body[2].uid).toBe(item1.uid);

            // Verify the content matches expected order
            expect(response.body[0].content).toBe('Third item (newest)');
            expect(response.body[1].content).toBe('Second item');
            expect(response.body[2].content).toBe('First item (oldest)');
        });

        it('should require authentication', async () => {
            const response = await request(app).get('/api/inbox');

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authentication required');
        });

        it('should support pagination with limit and offset', async () => {
            // Create 25 inbox items
            const items = [];
            for (let i = 1; i <= 25; i++) {
                const item = await InboxItem.create({
                    content: `Item ${i}`,
                    status: 'added',
                    source: 'test',
                    user_id: user.id,
                });
                items.push(item);
                // Small delay to ensure different timestamps
                await new Promise((resolve) => setTimeout(resolve, 5));
            }

            // Test first page (default limit of 20)
            const response1 = await agent.get('/api/inbox?limit=20&offset=0');
            expect(response1.status).toBe(200);
            expect(response1.body.items.length).toBe(20);
            expect(response1.body.pagination.total).toBe(26); // 25 + 1 from beforeEach
            expect(response1.body.pagination.hasMore).toBe(true);
            expect(response1.body.pagination.offset).toBe(0);
            expect(response1.body.pagination.limit).toBe(20);

            // Test second page
            const response2 = await agent.get('/api/inbox?limit=20&offset=20');
            expect(response2.status).toBe(200);
            expect(response2.body.items.length).toBe(6); // Remaining items
            expect(response2.body.pagination.total).toBe(26);
            expect(response2.body.pagination.hasMore).toBe(false);
            expect(response2.body.pagination.offset).toBe(20);
        });

        it('should support loading more than 20 items at once', async () => {
            // Create 30 inbox items
            for (let i = 1; i <= 30; i++) {
                await InboxItem.create({
                    content: `Item ${i}`,
                    status: 'added',
                    source: 'test',
                    user_id: user.id,
                });
                await new Promise((resolve) => setTimeout(resolve, 5));
            }

            // Request 40 items (should get all 31: 30 + 1 from beforeEach)
            const response = await agent.get('/api/inbox?limit=40&offset=0');
            expect(response.status).toBe(200);
            expect(response.body.items.length).toBe(31);
            expect(response.body.pagination.total).toBe(31);
            expect(response.body.pagination.hasMore).toBe(false);
            expect(response.body.pagination.limit).toBe(40);
        });

        it('should return items in newest-first order when paginating', async () => {
            // Create 25 inbox items
            for (let i = 1; i <= 25; i++) {
                await InboxItem.create({
                    content: `Item ${i}`,
                    status: 'added',
                    source: 'test',
                    user_id: user.id,
                });
                await new Promise((resolve) => setTimeout(resolve, 5));
            }

            // Get first page
            const response = await agent.get('/api/inbox?limit=20&offset=0');
            expect(response.status).toBe(200);

            // Verify newest items are first
            const items = response.body.items;
            expect(items[0].content).toBe('Item 25'); // Newest
            expect(items[19].content).toBe('Item 6'); // 20th item
        });
    });

    describe('GET /api/inbox/:uid', () => {
        let inboxItem;

        beforeEach(async () => {
            inboxItem = await InboxItem.create({
                content: 'Test content',
                source: 'test',
                user_id: user.id,
                notion_page_id: 'inbox-page-id',
            });
        });

        it('should get inbox item by uid', async () => {
            const response = await agent.get(`/api/inbox/${inboxItem.uid}`);

            expect(response.status).toBe(200);
            expect(response.body.uid).toBe(inboxItem.uid);
            expect(response.body.content).toBe(inboxItem.content);
            expect(response.body).toHaveProperty('notion_last_edited_time');
        });

        it('should return 400 for invalid uid format', async () => {
            const response = await agent.get('/api/inbox/invalid-uid');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid UID');
        });

        it('should return 404 for non-existent inbox item', async () => {
            const response = await agent.get('/api/inbox/abcd1234efghijk');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Inbox item not found.');
        });

        it("should not allow access to other user's inbox items", async () => {
            const bcrypt = require('bcrypt');
            const otherUser = await User.create({
                email: 'other@example.com',
                password_digest: await bcrypt.hash('password123', 10),
            });

            const otherInboxItem = await InboxItem.create({
                content: 'Other content',
                source: 'test',
                user_id: otherUser.id,
            });

            const response = await agent.get(
                `/api/inbox/${otherInboxItem.uid}`
            );

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Inbox item not found.');
        });

        it('should require authentication', async () => {
            const response = await request(app).get(
                `/api/inbox/${inboxItem.uid}`
            );

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authentication required');
        });
    });

    describe('PATCH /api/inbox/:uid', () => {
        let inboxItem;

        beforeEach(async () => {
            inboxItem = await InboxItem.create({
                content: 'Test content',
                status: 'added',
                source: 'test',
                user_id: user.id,
            });
        });

        it('should update inbox item', async () => {
            const updateData = {
                content: 'Updated content',
                status: 'processed',
                priority: 'medium',
            };

            const response = await agent
                .patch(`/api/inbox/${inboxItem.uid}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.content).toBe(updateData.content);
            expect(response.body.status).toBe(updateData.status);
            expect(response.body.priority).toBe(1);
            expect(emitTgHubWebhook).toHaveBeenCalledWith({
                entityType: 'inbox_item',
                entityUid: inboxItem.uid,
                eventType: 'updated',
                updatedAt: expect.any(String),
            });
        });

        it('should skip webhook when update comes from event-hub sync', async () => {
            const response = await agent
                .patch(`/api/inbox/${inboxItem.uid}`)
                .set('X-Sync-Origin', 'event-hub')
                .send({ content: 'Synced from Notion' });

            expect(response.status).toBe(200);
            expect(response.body.content).toBe('Synced from Notion');
            expect(emitTgHubWebhook).not.toHaveBeenCalled();
        });

        it('should return 400 for invalid uid format', async () => {
            const response = await agent
                .patch('/api/inbox/invalid-uid')
                .send({ content: 'Updated' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid UID');
        });

        it('should return 404 for non-existent inbox item', async () => {
            const response = await agent
                .patch('/api/inbox/abcd1234efghijk')
                .send({ content: 'Updated' });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Inbox item not found.');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .patch(`/api/inbox/${inboxItem.uid}`)
                .send({ content: 'Updated' });

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authentication required');
        });
    });

    describe('PATCH /api/inbox/:uid/notion', () => {
        let inboxItem;

        beforeEach(async () => {
            inboxItem = await InboxItem.create({
                content: 'Test content',
                status: 'added',
                source: 'test',
                user_id: user.id,
            });
        });

        it('should update Notion metadata for an inbox item', async () => {
            const notionData = {
                notion_page_id: 'page-id',
                notion_url: 'https://www.notion.so/example',
                notion_synced_at: '2026-06-01T00:00:00.000Z',
                notion_last_edited_time: '2026-06-01T00:00:01.000Z',
                notion_sync_status: 'synced',
                notion_sync_error: null,
            };

            const response = await agent
                .patch(`/api/inbox/${inboxItem.uid}/notion`)
                .send(notionData);

            expect(response.status).toBe(200);
            expect(response.body.uid).toBe(inboxItem.uid);
            expect(response.body.notion_page_id).toBe(
                notionData.notion_page_id
            );
            expect(response.body.notion_url).toBe(notionData.notion_url);
            expect(response.body.notion_last_edited_time).toBe(
                notionData.notion_last_edited_time
            );
            expect(response.body.notion_sync_status).toBe('synced');

            const reloaded = await InboxItem.findByPk(inboxItem.id);
            expect(reloaded.notion_url).toBe(notionData.notion_url);
            expect(reloaded.notion_last_edited_time.toISOString()).toBe(
                notionData.notion_last_edited_time
            );
            expect(emitTgHubWebhook).not.toHaveBeenCalled();
        });

        it('should accept workspace Notion URLs', async () => {
            const notionData = {
                notion_page_id: 'page-id',
                notion_url: 'https://blueloverest.notion.so/example',
                notion_sync_status: 'synced',
            };

            const response = await agent
                .patch(`/api/inbox/${inboxItem.uid}/notion`)
                .send(notionData);

            expect(response.status).toBe(200);
            expect(response.body.notion_url).toBe(notionData.notion_url);

            const reloaded = await InboxItem.findByPk(inboxItem.id);
            expect(reloaded.notion_url).toBe(notionData.notion_url);
        });

        it('should reject non-Notion URLs', async () => {
            const response = await agent
                .patch(`/api/inbox/${inboxItem.uid}/notion`)
                .send({
                    notion_url: 'https://example.com/abc123',
                    notion_sync_status: 'synced',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid Notion URL.');
        });

        it('should reject invalid Notion last edited time', async () => {
            const response = await agent
                .patch(`/api/inbox/${inboxItem.uid}/notion`)
                .send({
                    notion_last_edited_time: 'not-a-date',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'Invalid Notion last edited time.'
            );

            const reloaded = await InboxItem.findByPk(inboxItem.id);
            expect(reloaded.notion_last_edited_time).toBeNull();
        });
    });

    describe('DELETE /api/inbox/:uid', () => {
        let inboxItem;

        beforeEach(async () => {
            inboxItem = await InboxItem.create({
                content: 'Test content',
                source: 'test',
                user_id: user.id,
                notion_page_id: 'inbox-page-id',
            });
        });

        it('should delete inbox item', async () => {
            const response = await agent.delete(`/api/inbox/${inboxItem.uid}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe(
                'Inbox item successfully deleted'
            );

            // Verify inbox item status is updated to deleted
            const deletedItem = await InboxItem.findOne({
                where: { uid: inboxItem.uid },
            });
            expect(deletedItem).not.toBeNull();
            expect(deletedItem.status).toBe('deleted');
            expect(emitTgHubWebhook).toHaveBeenCalledWith({
                entityType: 'inbox_item',
                entityUid: inboxItem.uid,
                eventType: 'deleted',
                updatedAt: expect.any(String),
                notionPageId: 'inbox-page-id',
            });
        });

        it('should return 400 for invalid uid format', async () => {
            const response = await agent.delete('/api/inbox/invalid-uid');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid UID');
        });

        it('should return 404 for non-existent inbox item', async () => {
            const response = await agent.delete('/api/inbox/abcd1234efghijk');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Inbox item not found.');
        });

        it('should require authentication', async () => {
            const response = await request(app).delete(
                `/api/inbox/${inboxItem.uid}`
            );

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authentication required');
        });
    });

    describe('PATCH /api/inbox/:uid/process', () => {
        let inboxItem;

        beforeEach(async () => {
            inboxItem = await InboxItem.create({
                content: 'Test content',
                status: 'added',
                source: 'test',
                user_id: user.id,
            });
        });

        it('should process inbox item', async () => {
            const response = await agent.patch(
                `/api/inbox/${inboxItem.uid}/process`
            );

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('processed');
            expect(emitTgHubWebhook).toHaveBeenCalledWith({
                entityType: 'inbox_item',
                entityUid: inboxItem.uid,
                eventType: 'processed',
                updatedAt: expect.any(String),
            });
        });

        it('should copy Notion metadata when converting inbox item to a task', async () => {
            await inboxItem.update({
                notion_page_id: 'page-id',
                notion_url: 'https://www.notion.so/example',
                notion_synced_at: new Date('2026-06-01T00:00:00.000Z'),
                notion_last_edited_time: new Date('2026-06-01T00:00:01.000Z'),
                notion_sync_status: 'synced',
                notion_sync_error: 'old error',
            });

            const taskResponse = await agent.post('/api/task').send({
                name: 'Task from inbox',
                inbox_item_uid: inboxItem.uid,
            });

            expect(taskResponse.status).toBe(201);

            const task = await Task.findOne({
                where: { uid: taskResponse.body.uid },
            });
            expect(task.notion_page_id).toBe('page-id');
            expect(task.notion_url).toBe('https://www.notion.so/example');
            expect(task.notion_synced_at.toISOString()).toBe(
                '2026-06-01T00:00:00.000Z'
            );
            expect(task.notion_last_edited_time.toISOString()).toBe(
                '2026-06-01T00:00:01.000Z'
            );
            expect(task.notion_sync_status).toBe('synced');
            expect(task.notion_sync_error).toBe('old error');
            expect(emitTgHubWebhook).toHaveBeenCalledWith({
                entityType: 'task',
                entityUid: taskResponse.body.uid,
                eventType: 'created',
                updatedAt: expect.any(String),
                notionPageId: 'page-id',
            });
        });

        it('should return 404 for non-existent inbox item', async () => {
            const response = await agent.patch(
                '/api/inbox/invalid-uid/process'
            );

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid UID');
        });

        it('should return 404 for non-existent item', async () => {
            const response = await agent.patch(
                '/api/inbox/abcd1234efghijk/process'
            );

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Inbox item not found.');
        });

        it('should require authentication', async () => {
            const response = await request(app).patch(
                `/api/inbox/${inboxItem.uid}/process`
            );

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authentication required');
        });
    });
});
