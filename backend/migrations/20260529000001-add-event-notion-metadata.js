'use strict';

const TABLES_WITH_NOTION_METADATA = ['inbox_items', 'tasks'];

const NOTION_COLUMNS = {
    notion_page_id: {
        type: 'STRING',
        allowNull: true,
        defaultValue: null,
    },
    notion_url: {
        type: 'TEXT',
        allowNull: true,
        defaultValue: null,
    },
    notion_synced_at: {
        type: 'DATE',
        allowNull: true,
        defaultValue: null,
    },
    notion_sync_status: {
        type: 'STRING',
        allowNull: true,
        defaultValue: null,
    },
    notion_sync_error: {
        type: 'TEXT',
        allowNull: true,
        defaultValue: null,
    },
};

async function hasColumn(queryInterface, tableName, columnName) {
    const table = await queryInterface.describeTable(tableName);
    return Object.prototype.hasOwnProperty.call(table, columnName);
}

module.exports = {
    async up(queryInterface, Sequelize) {
        for (const tableName of TABLES_WITH_NOTION_METADATA) {
            for (const [columnName, definition] of Object.entries(
                NOTION_COLUMNS
            )) {
                if (await hasColumn(queryInterface, tableName, columnName)) {
                    continue;
                }

                await queryInterface.addColumn(tableName, columnName, {
                    ...definition,
                    type: Sequelize[definition.type],
                });
            }
        }

        if (!(await hasColumn(queryInterface, 'tasks', 'event_type'))) {
            await queryInterface.addColumn('tasks', 'event_type', {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'atomic',
            });
        }
    },

    async down(queryInterface) {
        if (await hasColumn(queryInterface, 'tasks', 'event_type')) {
            await queryInterface.removeColumn('tasks', 'event_type');
        }

        for (const tableName of TABLES_WITH_NOTION_METADATA) {
            for (const columnName of Object.keys(NOTION_COLUMNS).reverse()) {
                if (await hasColumn(queryInterface, tableName, columnName)) {
                    await queryInterface.removeColumn(tableName, columnName);
                }
            }
        }
    },
};
