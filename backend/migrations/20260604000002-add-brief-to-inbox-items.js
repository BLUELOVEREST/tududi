'use strict';

const { safeAddColumns, safeRemoveColumn } = require('../utils/migration-utils');

module.exports = {
    async up(queryInterface, Sequelize) {
        await safeAddColumns(queryInterface, 'inbox_items', [
            {
                name: 'brief',
                definition: {
                    type: Sequelize.TEXT,
                    allowNull: true,
                    defaultValue: null,
                },
            },
        ]);
    },

    async down(queryInterface) {
        await safeRemoveColumn(queryInterface, 'inbox_items', 'brief');
    },
};
