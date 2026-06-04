'use strict';

const express = require('express');
const router = express.Router();
const notionSyncController = require('./controller');

router.post('/notion-sync/backfill', notionSyncController.backfill);
router.post('/notion-sync/diff', notionSyncController.diff);
router.post('/notion-sync/push', notionSyncController.push);
router.post('/notion-sync/retry', notionSyncController.retry);

module.exports = router;
