'use strict';

const notionSyncService = require('./service');

function sendSyncError(res, error) {
    const statusCode = error.statusCode || 500;
    if (error.publicMessage) {
        console.error('Notion sync configuration error:', error.message);
    }
    res.status(statusCode).json({
        error: error.publicMessage || error.message,
        response: error.response,
    });
}

const notionSyncController = {
    async backfill(req, res) {
        try {
            const result = await notionSyncService.backfillNotionEvents({
                limit: req.body?.limit,
                dryRun: req.body?.dry_run || req.body?.dryRun,
                forceUpdate: req.body?.force_update || req.body?.forceUpdate,
            });
            res.json(result);
        } catch (error) {
            sendSyncError(res, error);
        }
    },

    async diff(req, res) {
        try {
            const result = await notionSyncService.diffSyncRecords({
                limit: req.body?.limit,
            });
            res.json(result);
        } catch (error) {
            sendSyncError(res, error);
        }
    },

    async push(req, res) {
        try {
            const result = await notionSyncService.pushTududiRecords({
                limit: req.body?.limit,
            });
            res.json(result);
        } catch (error) {
            sendSyncError(res, error);
        }
    },

    async retry(req, res) {
        try {
            const result = await notionSyncService.retryFailedRecords();
            res.json(result);
        } catch (error) {
            sendSyncError(res, error);
        }
    },
};

module.exports = notionSyncController;
