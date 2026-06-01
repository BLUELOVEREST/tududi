'use strict';

const { ValidationError } = require('../../shared/errors');

const NOTION_METADATA_FIELDS = [
    'notion_page_id',
    'notion_url',
    'notion_synced_at',
    'notion_sync_status',
    'notion_sync_error',
];

const NOTION_SYNC_STATUSES = ['pending', 'synced', 'error'];
const NOTION_URL_PATTERN = /^https:\/\/(www\.)?notion\.so\//;

function buildNotionMetadataUpdate(body = {}) {
    const update = {};

    for (const field of NOTION_METADATA_FIELDS) {
        if (body[field] !== undefined) {
            update[field] = body[field];
        }
    }

    if (
        update.notion_sync_status !== undefined &&
        update.notion_sync_status !== null &&
        !NOTION_SYNC_STATUSES.includes(update.notion_sync_status)
    ) {
        throw new ValidationError('Invalid Notion sync status.');
    }

    if (
        update.notion_url !== undefined &&
        update.notion_url !== null &&
        update.notion_url !== '' &&
        !NOTION_URL_PATTERN.test(update.notion_url)
    ) {
        throw new ValidationError('Invalid Notion URL.');
    }

    if (
        update.notion_synced_at !== undefined &&
        update.notion_synced_at !== null
    ) {
        const syncedAt = new Date(update.notion_synced_at);
        if (Number.isNaN(syncedAt.getTime())) {
            throw new ValidationError('Invalid Notion sync timestamp.');
        }
        update.notion_synced_at = syncedAt;
    }

    return update;
}

module.exports = {
    NOTION_METADATA_FIELDS,
    NOTION_SYNC_STATUSES,
    buildNotionMetadataUpdate,
};
