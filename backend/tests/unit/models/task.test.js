const { Task, User } = require('../../../models');

describe('Task Model', () => {
    let user;

    beforeEach(async () => {
        const bcrypt = require('bcrypt');
        user = await User.create({
            email: 'test@example.com',
            password_digest: await bcrypt.hash('password123', 10),
        });
    });

    describe('validation', () => {
        it('should create a task with valid data', async () => {
            const taskData = {
                name: 'Test Task',
                user_id: user.id,
            };

            const task = await Task.create(taskData);

            expect(task.name).toBe(taskData.name);
            expect(task.user_id).toBe(user.id);
            expect(task.priority).toBe(0);
            expect(task.status).toBe(Task.STATUS.PLANNED);
            expect(task.recurrence_type).toBe('none');
        });

        it('should require name', async () => {
            const taskData = {
                user_id: user.id,
            };

            await expect(Task.create(taskData)).rejects.toThrow();
        });

        it('should require user_id', async () => {
            const taskData = {
                name: 'Test Task',
            };

            await expect(Task.create(taskData)).rejects.toThrow();
        });

        it('should validate priority range', async () => {
            const taskData = {
                name: 'Test Task',
                user_id: user.id,
                priority: 5,
            };

            await expect(Task.create(taskData)).rejects.toThrow();
        });

        it('should validate status range', async () => {
            const taskData = {
                name: 'Test Task',
                user_id: user.id,
                status: 10,
            };

            await expect(Task.create(taskData)).rejects.toThrow();
        });
    });

    describe('constants', () => {
        it('should have correct priority constants', () => {
            expect(Task.PRIORITY.LOW).toBe(0);
            expect(Task.PRIORITY.MEDIUM).toBe(1);
            expect(Task.PRIORITY.HIGH).toBe(2);
        });

        it('should have correct status constants', () => {
            expect(Task.STATUS.NOT_STARTED).toBe(0);
            expect(Task.STATUS.IN_PROGRESS).toBe(1);
            expect(Task.STATUS.DONE).toBe(2);
            expect(Task.STATUS.ARCHIVED).toBe(3);
            expect(Task.STATUS.WAITING).toBe(4);
        });

        it('defines validating and optimizing workflow statuses', () => {
            expect(Task.STATUS.VALIDATING).toBe(7);
            expect(Task.STATUS.OPTIMIZING).toBe(8);
            expect(Task.getStatusName(Task.STATUS.VALIDATING)).toBe(
                'validating'
            );
            expect(Task.getStatusName(Task.STATUS.OPTIMIZING)).toBe(
                'optimizing'
            );
            expect(Task.getStatusValue('validating')).toBe(
                Task.STATUS.VALIDATING
            );
            expect(Task.getStatusValue('optimizing')).toBe(
                Task.STATUS.OPTIMIZING
            );
        });
    });

    describe('instance methods', () => {
        let task;

        beforeEach(async () => {
            task = await Task.create({
                name: 'Test Task',
                user_id: user.id,
            });
        });

        it('should return correct priority name', async () => {
            task.priority = Task.PRIORITY.LOW;
            expect(Task.getPriorityName(task.priority)).toBe('low');

            task.priority = Task.PRIORITY.MEDIUM;
            expect(Task.getPriorityName(task.priority)).toBe('medium');

            task.priority = Task.PRIORITY.HIGH;
            expect(Task.getPriorityName(task.priority)).toBe('high');
        });

        it('should return correct status name', async () => {
            task.status = Task.STATUS.NOT_STARTED;
            expect(Task.getStatusName(task.status)).toBe('not_started');

            task.status = Task.STATUS.IN_PROGRESS;
            expect(Task.getStatusName(task.status)).toBe('in_progress');

            task.status = Task.STATUS.DONE;
            expect(Task.getStatusName(task.status)).toBe('done');

            task.status = Task.STATUS.ARCHIVED;
            expect(Task.getStatusName(task.status)).toBe('archived');

            task.status = Task.STATUS.WAITING;
            expect(Task.getStatusName(task.status)).toBe('waiting');

            task.status = Task.STATUS.VALIDATING;
            expect(Task.getStatusName(task.status)).toBe('validating');

            task.status = Task.STATUS.OPTIMIZING;
            expect(Task.getStatusName(task.status)).toBe('optimizing');
        });
    });

    describe('default values', () => {
        it('should set correct default values', async () => {
            const task = await Task.create({
                name: 'Test Task',
                user_id: user.id,
            });

            expect(task.priority).toBe(0);
            expect(task.status).toBe(Task.STATUS.PLANNED);
            expect(task.recurrence_type).toBe('none');
        });

        it('should default to an atomic event type and empty Notion metadata', async () => {
            const task = await Task.create({
                name: 'Test Task',
                user_id: user.id,
            });

            expect(task.event_type).toBe('atomic');
            expect(task.notion_page_id).toBeNull();
            expect(task.notion_url).toBeNull();
            expect(task.notion_synced_at).toBeNull();
            expect(task.notion_last_edited_time).toBeNull();
            expect(task.notion_sync_status).toBeNull();
            expect(task.notion_sync_error).toBeNull();
        });
    });

    describe('optional fields', () => {
        it('should allow optional fields to be null', async () => {
            const task = await Task.create({
                name: 'Test Task',
                user_id: user.id,
                due_date: null,
                note: null,
                recurrence_interval: null,
                recurrence_end_date: null,
                project_id: null,
            });

            expect(task.due_date).toBeNull();
            expect(task.note).toBeNull();
            expect(task.recurrence_interval).toBeNull();
            expect(task.recurrence_end_date).toBeNull();
            expect(task.project_id).toBeNull();
        });

        it('should accept compound event type', async () => {
            const task = await Task.create({
                name: 'Test Task',
                user_id: user.id,
                event_type: 'compound',
            });

            expect(task.event_type).toBe('compound');
        });

        it('should accept optional field values', async () => {
            const dueDate = new Date();
            const task = await Task.create({
                name: 'Test Task',
                due_date: dueDate,
                priority: Task.PRIORITY.HIGH,
                status: Task.STATUS.IN_PROGRESS,
                note: 'Test Note',
                user_id: user.id,
            });

            expect(task.due_date).toEqual(dueDate);
            expect(task.priority).toBe(Task.PRIORITY.HIGH);
            expect(task.status).toBe(Task.STATUS.IN_PROGRESS);
            expect(task.note).toBe('Test Note');
        });

        it('should store Notion last edited time', async () => {
            const lastEditedTime = new Date('2026-06-01T00:00:01.000Z');

            const task = await Task.create({
                name: 'Test Task',
                user_id: user.id,
                notion_last_edited_time: lastEditedTime,
            });

            expect(task.notion_last_edited_time).toEqual(lastEditedTime);
        });
    });
});
