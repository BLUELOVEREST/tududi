'use strict';

const express = require('express');
const router = express.Router();
const notionSyncController = require('./controller');

router.post('/notion-sync/backfill', notionSyncController.backfill);

module.exports = router;
