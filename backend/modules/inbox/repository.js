'use strict';

const { InboxItem } = require('../../models');
const BaseRepository = require('../../shared/database/BaseRepository');

const PUBLIC_ATTRIBUTES = [
    'uid',
    'title',
    'content',
    'brief',
    'status',
    'priority',
    'source',
    'notion_page_id',
    'notion_url',
    'notion_synced_at',
    'notion_last_edited_time',
    'notion_sync_status',
    'notion_sync_error',
    'created_at',
    'updated_at',
];

class InboxRepository extends BaseRepository {
    constructor() {
        super(InboxItem);
    }

    /**
     * Find all active inbox items for a user (status = 'added').
     */
    async findAllActive(
        userId,
        { limit, offset, notion_page_id, notion_sync_status } = {}
    ) {
        const where = {
            user_id: userId,
        };

        if (notion_page_id) {
            where.notion_page_id = notion_page_id;
        }

        if (notion_sync_status) {
            where.notion_sync_status = notion_sync_status;
        }

        if (!notion_page_id && !notion_sync_status) {
            where.status = 'added';
        }

        const options = {
            where,
            order: [['created_at', 'DESC']],
        };

        if (limit !== undefined) {
            options.limit = limit;
            options.offset = offset || 0;
        }

        return this.model.findAll(options);
    }

    /**
     * Count active inbox items for a user.
     */
    async countActive(userId, { notion_page_id, notion_sync_status } = {}) {
        const where = {
            user_id: userId,
        };

        if (notion_page_id) {
            where.notion_page_id = notion_page_id;
        }

        if (notion_sync_status) {
            where.notion_sync_status = notion_sync_status;
        }

        if (!notion_page_id && !notion_sync_status) {
            where.status = 'added';
        }

        return this.model.count({
            where,
            raw: true,
        });
    }

    /**
     * Find an inbox item by UID for a specific user.
     */
    async findByUid(userId, uid) {
        return this.model.findOne({
            where: {
                uid,
                user_id: userId,
            },
        });
    }

    /**
     * Find an inbox item by UID with limited public attributes.
     */
    async findByUidPublic(userId, uid) {
        return this.model.findOne({
            where: {
                uid,
                user_id: userId,
            },
            attributes: PUBLIC_ATTRIBUTES,
        });
    }

    /**
     * Create a new inbox item for a user.
     */
    async createForUser(userId, { content, title, brief, source, priority }) {
        return this.model.create({
            content,
            title,
            brief,
            source,
            priority,
            user_id: userId,
        });
    }

    /**
     * Update an inbox item.
     */
    async updateItem(item, data) {
        await item.update(data);
        return item;
    }

    /**
     * Soft delete an inbox item (mark as 'deleted').
     */
    async softDelete(item) {
        await item.update({ status: 'deleted' });
        return item;
    }

    /**
     * Mark an inbox item as processed.
     */
    async markProcessed(item) {
        await item.update({ status: 'processed' });
        return item;
    }
}

module.exports = new InboxRepository();
module.exports.PUBLIC_ATTRIBUTES = PUBLIC_ATTRIBUTES;
