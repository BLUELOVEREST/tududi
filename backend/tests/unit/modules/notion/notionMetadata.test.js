'use strict';

const {
    buildNotionMetadataUpdate,
} = require('../../../../modules/notion/notionMetadata');

describe('notionMetadata', () => {
    describe('buildNotionMetadataUpdate', () => {
        it('should accept workspace Notion URLs', () => {
            const update = buildNotionMetadataUpdate({
                notion_url: 'https://blueloverest.notion.so/example',
            });

            expect(update.notion_url).toBe(
                'https://blueloverest.notion.so/example'
            );
        });

        it('should accept current Notion URL domains', () => {
            for (const notionUrl of [
                'https://www.notion.com/example',
                'https://blueloverest.notion.com/example',
                'https://blueloverest.notion.site/example',
            ]) {
                const update = buildNotionMetadataUpdate({
                    notion_url: notionUrl,
                });

                expect(update.notion_url).toBe(notionUrl);
            }
        });

        it('should reject non-Notion URLs', () => {
            expect(() =>
                buildNotionMetadataUpdate({
                    notion_url: 'https://example.com/abc123',
                })
            ).toThrow('Invalid Notion URL.');
        });
    });
});
