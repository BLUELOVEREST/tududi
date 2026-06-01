'use strict';

const TABLES_WITH_SYNC_WATERMARK = ['tasks', 'inbox_items'];
const WATERMARK_COLUMN = 'notion_last_edited_time';

async function hasColumn(queryInterface, tableName, columnName) {
    const table = await queryInterface.describeTable(tableName);
    return Object.prototype.hasOwnProperty.call(table, columnName);
}

module.exports = {
    async up(queryInterface, Sequelize) {
        for (const tableName of TABLES_WITH_SYNC_WATERMARK) {
            if (await hasColumn(queryInterface, tableName, WATERMARK_COLUMN)) {
                continue;
            }

            await queryInterface.addColumn(tableName, WATERMARK_COLUMN, {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null,
            });
        }

        await queryInterface.bulkUpdate(
            'tasks',
            { status: 6 },
            { status: 0 }
        );
    },

    async down(queryInterface) {
        for (const tableName of TABLES_WITH_SYNC_WATERMARK) {
            if (await hasColumn(queryInterface, tableName, WATERMARK_COLUMN)) {
                await queryInterface.removeColumn(tableName, WATERMARK_COLUMN);
            }
        }
    },
};
