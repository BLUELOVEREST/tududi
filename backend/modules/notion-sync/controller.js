'use strict';

const notionSyncService = require('./service');

const notionSyncController = {
    async backfill(req, res) {
        try {
            const result = await notionSyncService.backfillNotionEvents({
                limit: req.body?.limit,
                dryRun: req.body?.dry_run || req.body?.dryRun,
            });
            res.json(result);
        } catch (error) {
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({
                error: error.message,
                response: error.response,
            });
        }
    },
};

module.exports = notionSyncController;
