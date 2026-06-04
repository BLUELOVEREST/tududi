const { DataTypes } = require('sequelize');
const { uid } = require('../utils/uid');

module.exports = (sequelize) => {
    const InboxItem = sequelize.define(
        'InboxItem',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            uid: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                defaultValue: uid,
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            title: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'added',
            },
            priority: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null,
                validate: {
                    min: 0,
                    max: 2,
                },
            },
            source: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            suggested_type: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            suggested_reason: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            parsed_tags: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            parsed_projects: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            cleaned_content: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            notion_page_id: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: null,
            },
            notion_url: {
                type: DataTypes.TEXT,
                allowNull: true,
                defaultValue: null,
            },
            notion_synced_at: {
                type: DataTypes.DATE,
                allowNull: true,
                defaultValue: null,
            },
            notion_last_edited_time: {
                type: DataTypes.DATE,
                allowNull: true,
                defaultValue: null,
            },
            notion_sync_status: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: null,
            },
            notion_sync_error: {
                type: DataTypes.TEXT,
                allowNull: true,
                defaultValue: null,
            },
        },
        {
            tableName: 'inbox_items',
            indexes: [
                {
                    fields: ['user_id'],
                },
            ],
        }
    );

    return InboxItem;
};
