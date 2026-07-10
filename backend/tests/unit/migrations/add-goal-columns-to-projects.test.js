const migration = require('../../../migrations/20260624000002-add-goal-columns-to-projects');

describe('20260624000002-add-goal-columns-to-projects migration', () => {
    const Sequelize = {
        INTEGER: 'INTEGER',
        BOOLEAN: 'BOOLEAN',
    };

    it('continues when goal_id already exists from a previous partial migration', async () => {
        const queryInterface = {
            showAllTables: jest.fn().mockResolvedValue(['projects']),
            describeTable: jest.fn().mockResolvedValue({
                id: {},
                goal_id: {},
            }),
            addColumn: jest.fn((table, column) => {
                if (column === 'goal_id') {
                    return Promise.reject(
                        new Error('SQLITE_ERROR: duplicate column name: goal_id')
                    );
                }
                return Promise.resolve();
            }),
            showIndex: jest.fn().mockResolvedValue([]),
            addIndex: jest.fn().mockResolvedValue(),
        };

        await expect(
            migration.up(queryInterface, Sequelize)
        ).resolves.toBeUndefined();

        expect(queryInterface.addColumn).toHaveBeenCalledTimes(1);
        expect(queryInterface.addColumn).toHaveBeenCalledWith(
            'projects',
            'is_maintenance',
            expect.objectContaining({ type: Sequelize.BOOLEAN })
        );
        expect(queryInterface.addIndex).toHaveBeenCalledWith(
            'projects',
            ['goal_id'],
            { name: 'projects_goal_id_idx' }
        );
    });
});
