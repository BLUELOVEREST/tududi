'use strict';

async function emitTgHubWebhook({
    entityType,
    entityUid,
    eventType,
    updatedAt,
    notionPageId,
}) {
    const url = process.env.EVENT_HUB_WEBHOOK_URL;

    if (!url) {
        return;
    }

    const payload = {
        source: 'tududi',
        entity_type: entityType,
        entity_uid: entityUid,
        event_type: eventType,
        updated_at: updatedAt,
    };

    if (notionPageId) {
        payload.notion_page_id = notionPageId;
    }

    const headers = {
        'Content-Type': 'application/json',
    };

    if (process.env.EVENT_HUB_WEBHOOK_TOKEN) {
        headers.Authorization = `Bearer ${process.env.EVENT_HUB_WEBHOOK_TOKEN}`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('event-hub webhook failed:', {
                status: response.status,
                statusText: response.statusText,
            });
        }
    } catch (error) {
        console.error('event-hub webhook failed:', error);
    }
}

module.exports = {
    emitTgHubWebhook,
};
