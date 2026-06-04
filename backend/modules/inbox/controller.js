'use strict';

const inboxService = require('./service');
const { UnauthorizedError } = require('../../shared/errors');
const { getAuthenticatedUserId } = require('../../utils/request-utils');

/**
 * Get authenticated user ID or throw UnauthorizedError.
 */
function requireUserId(req) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        throw new UnauthorizedError('Authentication required');
    }
    return userId;
}

function isTgHubSyncRequest(req) {
    return req.get('X-Sync-Origin') === 'event-hub';
}

/**
 * Inbox controller - handles HTTP requests/responses.
 */
const inboxController = {
    /**
     * GET /api/inbox
     * List all active inbox items for the current user.
     */
    async list(req, res, next) {
        try {
            const userId = requireUserId(req);
            const { limit, offset, notion_page_id, notion_sync_status } =
                req.query;
            const result = await inboxService.getAll(userId, {
                limit,
                offset,
                notion_page_id,
                notion_sync_status,
            });
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/inbox/:uid
     * Get a single inbox item by UID.
     */
    async getOne(req, res, next) {
        try {
            const userId = requireUserId(req);
            const { uid } = req.params;
            const item = await inboxService.getByUid(userId, uid);
            res.json(item);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/inbox
     * Create a new inbox item.
     */
    async create(req, res, next) {
        try {
            const userId = requireUserId(req);
            const { content, source, priority } = req.body;
            const item = await inboxService.create(userId, {
                content,
                source,
                priority,
                suppressWebhook: isTgHubSyncRequest(req),
            });
            res.status(201).json(item);
        } catch (error) {
            next(error);
        }
    },

    /**
     * PATCH /api/inbox/:uid
     * Update an inbox item.
     */
    async update(req, res, next) {
        try {
            const userId = requireUserId(req);
            const { uid } = req.params;
            const { content, status, priority } = req.body;
            const item = await inboxService.update(userId, uid, {
                content,
                status,
                priority,
                suppressWebhook: isTgHubSyncRequest(req),
            });
            res.json(item);
        } catch (error) {
            next(error);
        }
    },

    /**
     * PATCH /api/inbox/:uid/notion
     * Update Notion sync metadata for an inbox item.
     */
    async updateNotion(req, res, next) {
        try {
            const userId = requireUserId(req);
            const { uid } = req.params;
            const item = await inboxService.updateNotionMetadata(
                userId,
                uid,
                req.body
            );
            res.json(item);
        } catch (error) {
            next(error);
        }
    },

    /**
     * DELETE /api/inbox/:uid
     * Soft delete an inbox item.
     */
    async delete(req, res, next) {
        try {
            const userId = requireUserId(req);
            const { uid } = req.params;
            const result = await inboxService.delete(userId, uid);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    /**
     * PATCH /api/inbox/:uid/process
     * Mark an inbox item as processed.
     */
    async process(req, res, next) {
        try {
            const userId = requireUserId(req);
            const { uid } = req.params;
            const item = await inboxService.process(userId, uid);
            res.json(item);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/inbox/analyze-text
     * Analyze text content without creating an inbox item.
     */
    async analyzeText(req, res, next) {
        try {
            const { content } = req.body;
            const result = inboxService.analyzeText(content);
            res.json(result);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = inboxController;
