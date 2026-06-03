const request = require('supertest');

jest.mock('../../modules/webhooks/tgHubWebhookService', () => ({
    emitTgHubWebhook: jest.fn(),
}));

const app = require('../../app');
const { Task, User } = require('../../models');
const { createTestUser } = require('../helpers/testUtils');
const {
    emitTgHubWebhook,
} = require('../../modules/webhooks/tgHubWebhookService');

describe('Tasks Routes', () => {
    let user, agent;

    beforeEach(async () => {
        emitTgHubWebhook.mockClear();

        user = await createTestUser({
            email: 'test@example.com',
        });

        // Create authenticated agent
        agent = request.agent(app);
        await agent.post('/api/login').send({
            email: 'test@example.com',
            password: 'password123',
        });
    });

    describe('POST /api/task', () => {
        it('should create a new task', async () => {
            const taskData = {
                name: 'Test Task',
                note: 'Test Note',
                priority: 1,
                status: 0,
            };

            const response = await agent.post('/api/task').send(taskData);

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.name).toBe(taskData.name);
            expect(response.body.note).toBe(taskData.note);
            expect(response.body.priority).toBe(taskData.priority);
            expect(response.body.status).toBe(taskData.status);
            expect(response.body.user_id).toBe(user.id);
            expect(emitTgHubWebhook).toHaveBeenCalledWith({
                entityType: 'task',
                entityUid: response.body.uid,
                eventType: 'created',
                updatedAt: expect.any(String),
            });
        });

        it('should skip webhook when create comes from event-hub sync', async () => {
            const response = await agent
                .post('/api/task')
                .set('X-Sync-Origin', 'event-hub')
                .send({
                    name: 'Created from Notion',
                    status: 'planned',
                });

            expect(response.status).toBe(201);
            expect(response.body.name).toBe('Created from Notion');
            expect(emitTgHubWebhook).not.toHaveBeenCalled();
        });

        it('should default new tasks without status to planned', async () => {
            const taskData = {
                name: 'Task without status',
            };

            const response = await agent.post('/api/task').send(taskData);

            expect(response.status).toBe(201);
            expect(response.body.status).toBe(Task.STATUS.PLANNED);
        });

        it('should create a task with validating status', async () => {
            const taskData = {
                name: 'Validate workflow',
                status: 'validating',
            };

            const response = await agent.post('/api/task').send(taskData);

            expect(response.status).toBe(201);
            expect(response.body.status).toBe(Task.STATUS.VALIDATING);
        });

        it('should require authentication', async () => {
            const taskData = {
                name: 'Test Task',
            };

            const response = await request(app)
                .post('/api/task')
                .send(taskData);

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authentication required');
        });

        it('should require task name', async () => {
            // Mock console.error to suppress expected error log in test output
            const originalConsoleError = console.error;
            console.error = jest.fn();

            const taskData = {
                note: 'Test Note',
            };

            const response = await agent.post('/api/task').send(taskData);

            expect(response.status).toBe(400);

            // Restore original console.error
            console.error = originalConsoleError;
        });

        it('should not truncate long task names', async () => {
            const longTaskName =
                'This task has a long name, very long name, with lots of stuff';
            const taskData = {
                name: longTaskName,
                priority: 'low',
                status: 'not_started',
            };

            const response = await agent.post('/api/task').send(taskData);

            expect(response.status).toBe(201);
            expect(response.body.name).toBe(longTaskName);
            expect(response.body.name.length).toBe(longTaskName.length);

            const retrievedTask = await Task.findOne({
                where: { id: response.body.id },
            });
            expect(retrievedTask.name).toBe(longTaskName);
        });
    });

    describe('GET /api/tasks', () => {
        let task1, task2;

        beforeEach(async () => {
            task1 = await Task.create({
                name: 'Task 1',
                user_id: user.id,
                status: Task.STATUS.IN_PROGRESS, // Active status shows in today view
                notion_last_edited_time: new Date('2026-06-01T00:00:01.000Z'),
            });

            task2 = await Task.create({
                name: 'Task 2',
                user_id: user.id,
                status: Task.STATUS.NOT_STARTED, // Not active, won't show in today view
            });
        });

        it('should get all user tasks', async () => {
            const response = await agent.get('/api/tasks');

            expect(response.status).toBe(200);
            expect(response.body.tasks).toBeDefined();
            expect(response.body.tasks.length).toBe(2);
            expect(response.body.tasks.map((t) => t.id)).toContain(task1.id);
            expect(response.body.tasks.map((t) => t.id)).toContain(task2.id);
            const serializedTask = response.body.tasks.find(
                (t) => t.id === task1.id
            );
            expect(serializedTask.notion_last_edited_time).toBe(
                '2026-06-01T00:00:01.000Z'
            );
        });

        it('should filter today tasks (returns tasks with active status)', async () => {
            const response = await agent.get('/api/tasks?type=today');

            expect(response.status).toBe(200);
            expect(response.body.tasks).toBeDefined();
            expect(response.body.tasks.length).toBe(1);
            expect(response.body.tasks[0].id).toBe(task1.id);
        });

        it('should filter tasks by Notion page id', async () => {
            await task1.update({ notion_page_id: 'page-id-1' });
            await task2.update({ notion_page_id: 'page-id-2' });

            const response = await agent.get(
                '/api/tasks?notion_page_id=page-id-1'
            );

            expect(response.status).toBe(200);
            expect(response.body.tasks.map((task) => task.uid)).toEqual([
                task1.uid,
            ]);
        });

        it('should filter tasks by Notion sync status', async () => {
            await task1.update({ notion_sync_status: 'error' });
            await task2.update({ notion_sync_status: 'synced' });

            const response = await agent.get(
                '/api/tasks?notion_sync_status=error'
            );

            expect(response.status).toBe(200);
            expect(response.body.tasks.map((task) => task.uid)).toEqual([
                task1.uid,
            ]);
        });

        it('should require authentication', async () => {
            const response = await request(app).get('/api/tasks');

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authentication required');
        });
    });

    // Note: No individual task GET route exists in the current API

    describe('PATCH /api/task/:id', () => {
        let task;

        beforeEach(async () => {
            task = await Task.create({
                name: 'Test Task',
                priority: 0,
                status: 0,
                user_id: user.id,
            });
        });

        it('should update task', async () => {
            const updateData = {
                name: 'Updated Task',
                note: 'Updated Note',
                priority: 2,
                status: 1,
            };

            const response = await agent
                .patch(`/api/task/${task.uid}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.id).toBeDefined();
            expect(response.body.name).toBe(updateData.name);
            expect(response.body.note).toBe(updateData.note);
            expect(response.body.priority).toBe(updateData.priority);
            expect(response.body.status).toBe(updateData.status);
            expect(emitTgHubWebhook).toHaveBeenCalledWith({
                entityType: 'task',
                entityUid: task.uid,
                eventType: 'updated',
                updatedAt: expect.any(String),
            });
        });

        it('should skip webhook when update comes from event-hub sync', async () => {
            const response = await agent
                .patch(`/api/task/${task.uid}`)
                .set('X-Sync-Origin', 'event-hub')
                .send({ name: 'Synced from Notion' });

            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Synced from Notion');
            expect(emitTgHubWebhook).not.toHaveBeenCalled();
        });

        it('should update a task to optimizing status', async () => {
            const response = await agent
                .patch(`/api/task/${task.uid}`)
                .send({ status: 'optimizing' });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe(Task.STATUS.OPTIMIZING);
        });

        it('should update recurring task name without transformation', async () => {
            // Create a recurring task
            const recurringTask = await Task.create({
                name: 'My Daily Task',
                recurrence_type: 'daily',
                recurrence_interval: 1,
                user_id: user.id,
                status: 0,
            });

            const updateData = {
                name: 'Updated Daily Task Name',
            };

            const response = await agent
                .patch(`/api/task/${recurringTask.uid}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.id).toBeDefined();
            // The response should contain the actual updated name, not a transformed name like "Daily"
            expect(response.body.name).toBe(updateData.name);
            expect(response.body.original_name).toBe(updateData.name);
        });

        it('should return 403 for non-existent task', async () => {
            const response = await agent
                .patch('/api/task/nonexistent-uid-12345')
                .send({ name: 'Updated' });

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Forbidden');
        });

        it("should not allow updating other user's tasks", async () => {
            const bcrypt = require('bcrypt');
            const otherUser = await User.create({
                email: 'other@example.com',
                password_digest: await bcrypt.hash('password123', 10),
            });

            const otherTask = await Task.create({
                name: 'Other Task',
                user_id: otherUser.id,
            });

            const response = await agent
                .patch(`/api/task/${otherTask.uid}`)
                .send({ name: 'Updated' });

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Forbidden');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .patch(`/api/task/${task.uid}`)
                .send({ name: 'Updated' });

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authentication required');
        });
    });

    describe('PATCH /api/task/:uid/notion', () => {
        let task;

        beforeEach(async () => {
            task = await Task.create({
                name: 'Test Task',
                priority: 0,
                status: 0,
                user_id: user.id,
            });
        });

        it('should update Notion metadata for a task', async () => {
            const notionData = {
                notion_page_id: 'page-id',
                notion_url: 'https://www.notion.so/example',
                notion_synced_at: '2026-06-01T00:00:00.000Z',
                notion_last_edited_time: '2026-06-01T00:00:01.000Z',
                notion_sync_status: 'synced',
                notion_sync_error: null,
            };

            const response = await agent
                .patch(`/api/task/${task.uid}/notion`)
                .send(notionData);

            expect(response.status).toBe(200);
            expect(response.body.uid).toBe(task.uid);
            expect(response.body.notion_page_id).toBe(
                notionData.notion_page_id
            );
            expect(response.body.notion_url).toBe(notionData.notion_url);
            expect(response.body.notion_last_edited_time).toBe(
                notionData.notion_last_edited_time
            );
            expect(response.body.notion_sync_status).toBe('synced');

            const reloaded = await Task.findByPk(task.id);
            expect(reloaded.notion_url).toBe(notionData.notion_url);
            expect(reloaded.notion_last_edited_time.toISOString()).toBe(
                notionData.notion_last_edited_time
            );
            expect(emitTgHubWebhook).not.toHaveBeenCalled();
        });

        it('should reject invalid sync status', async () => {
            const response = await agent
                .patch(`/api/task/${task.uid}/notion`)
                .send({
                    notion_url: 'https://www.notion.so/task-page-id',
                    notion_sync_status: 'complete',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid Notion sync status.');
        });

        it('should reject invalid Notion last edited time', async () => {
            const response = await agent
                .patch(`/api/task/${task.uid}/notion`)
                .send({
                    notion_last_edited_time: 'not-a-date',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'Invalid Notion last edited time.'
            );

            const reloaded = await Task.findByPk(task.id);
            expect(reloaded.notion_last_edited_time).toBeNull();
        });
    });

    describe('DELETE /api/task/:id', () => {
        let task;

        beforeEach(async () => {
            task = await Task.create({
                name: 'Test Task',
                user_id: user.id,
                notion_page_id: 'task-page-id',
            });
        });

        it('should delete task', async () => {
            const response = await agent.delete(`/api/task/${task.uid}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Task successfully deleted');

            // Verify task is deleted
            const deletedTask = await Task.findByPk(task.id);
            expect(deletedTask).toBeNull();
            expect(emitTgHubWebhook).toHaveBeenCalledWith({
                entityType: 'task',
                entityUid: task.uid,
                eventType: 'deleted',
                updatedAt: expect.any(String),
                notionPageId: 'task-page-id',
            });
        }, 10000); // 10 second timeout for DELETE operations

        it('should return 403 for non-existent task', async () => {
            const response = await agent.delete(
                '/api/task/nonexistent-uid-12345'
            );

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Forbidden');
        });

        it("should not allow deleting other user's tasks", async () => {
            const bcrypt = require('bcrypt');
            const otherUser = await User.create({
                email: 'other@example.com',
                password_digest: await bcrypt.hash('password123', 10),
            });

            const otherTask = await Task.create({
                name: 'Other Task',
                user_id: otherUser.id,
            });

            const response = await agent.delete(`/api/task/${otherTask.uid}`);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Forbidden');
        }, 10000); // 10 second timeout for this specific test

        it('should require authentication', async () => {
            const response = await request(app).delete(`/api/task/${task.uid}`);

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authentication required');
        });
    });

    describe('Task with tags', () => {
        it('should create task with tags', async () => {
            const taskData = {
                name: 'Test Task',
                tags: [{ name: 'work' }, { name: 'urgent' }],
            };

            const response = await agent.post('/api/task').send(taskData);

            expect(response.status).toBe(201);
            expect(response.body.Tags).toBeDefined();
            expect(response.body.Tags.length).toBe(2);
            expect(response.body.Tags.map((t) => t.name)).toContain('work');
            expect(response.body.Tags.map((t) => t.name)).toContain('urgent');
        });

        it('should return all tags when filtering by a specific tag', async () => {
            const taskData = {
                name: 'Task with multiple tags',
                tags: [{ name: 'alpha' }, { name: 'beta' }],
            };

            const createResponse = await agent.post('/api/task').send(taskData);
            expect(createResponse.status).toBe(201);

            const response = await agent.get('/api/tasks?tag=alpha');

            expect(response.status).toBe(200);
            expect(response.body.tasks.length).toBe(1);

            const [task] = response.body.tasks;
            const tagNames = (task.tags || []).map((t) => t.name);

            expect(tagNames).toEqual(expect.arrayContaining(['alpha', 'beta']));
            expect(tagNames.length).toBe(2);
        });
    });

    describe('Subtasks filtering', () => {
        it('should not include subtasks at first level when retrieving /tasks', async () => {
            // Create a parent task
            const parentTask = await Task.create({
                name: 'Parent Task',
                user_id: user.id,
                status: 0,
            });

            // Create subtasks
            const subtask1 = await Task.create({
                name: 'Subtask 1',
                user_id: user.id,
                parent_task_id: parentTask.id,
                status: 0,
            });

            const subtask2 = await Task.create({
                name: 'Subtask 2',
                user_id: user.id,
                parent_task_id: parentTask.id,
                status: 0,
            });

            // Create another regular task (not a subtask)
            const regularTask = await Task.create({
                name: 'Regular Task',
                user_id: user.id,
                status: 0,
            });

            const response = await agent.get('/api/tasks');

            expect(response.status).toBe(200);
            expect(response.body.tasks).toBeDefined();

            // Should only return parent and regular tasks, not subtasks
            const taskIds = response.body.tasks.map((t) => t.id);
            const taskNames = response.body.tasks.map((t) => t.name);

            expect(taskIds).toContain(parentTask.id);
            expect(taskIds).toContain(regularTask.id);
            expect(taskIds).not.toContain(subtask1.id);
            expect(taskIds).not.toContain(subtask2.id);

            expect(taskNames).toContain('Parent Task');
            expect(taskNames).toContain('Regular Task');
            expect(taskNames).not.toContain('Subtask 1');
            expect(taskNames).not.toContain('Subtask 2');
        });
    });

    describe('Recurring task search functionality', () => {
        it('should include recurring task instances in search results', async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create a recurring task template (set for today to ensure it's included)
            const recurringTemplate = await Task.create({
                name: 'RecurringTask',
                user_id: user.id,
                recurrence_type: 'daily',
                recurrence_interval: 1,
                due_date: today,
                status: 0,
            });

            // Create a recurring task instance (simulating what the recurring task service would create)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const recurringInstance = await Task.create({
                name: 'RecurringTask',
                user_id: user.id,
                recurring_parent_id: recurringTemplate.id,
                due_date: tomorrow,
                status: 0,
            });

            // Create a regular non-recurring task for comparison
            const regularTask = await Task.create({
                name: 'Review Pull Request',
                user_id: user.id,
                status: 0,
            });

            const response = await agent.get(
                '/api/tasks?include_instances=true'
            );

            expect(response.status).toBe(200);
            expect(response.body.tasks).toBeDefined();

            const taskIds = response.body.tasks.map((t) => t.id);
            const taskNames = response.body.tasks.map((t) => t.name);

            // Should include the recurring template
            expect(taskIds).toContain(recurringTemplate.id);

            // Should include the recurring instance (this is the key fix - instances should be searchable)
            expect(taskIds).toContain(recurringInstance.id);

            // Should include the regular task
            expect(taskIds).toContain(regularTask.id);
            expect(taskNames).toContain('Review Pull Request');

            // Verify we have both the template and instance - this proves search will work on both
            const allTasks = response.body.tasks;
            const templateTask = allTasks.find(
                (t) => t.id === recurringTemplate.id
            );
            const instanceTask = allTasks.find(
                (t) => t.id === recurringInstance.id
            );

            expect(templateTask).toBeDefined();
            // The template name gets transformed to show the recurrence type in the API response
            expect(templateTask.name).toBe('Daily');
            expect(templateTask.recurrence_type).toBe('daily');
            expect(templateTask.recurring_parent_id).toBeNull();
            // The original name is preserved in original_name field
            expect(templateTask.original_name).toBe('RecurringTask');

            expect(instanceTask).toBeDefined();
            // Instances keep their original name
            expect(instanceTask.name).toBe('RecurringTask');
            expect(instanceTask.recurring_parent_id).toBe(recurringTemplate.id);
        });

        it('should not include past recurring instances', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            // Create a recurring task template
            const recurringTemplate = await Task.create({
                name: 'Daily Review',
                user_id: user.id,
                recurrence_type: 'daily',
                recurrence_interval: 1,
                due_date: yesterday, // Template is in the past but should still be included if it's recurring
                status: 0,
            });

            // Create a past recurring task instance
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            const pastInstance = await Task.create({
                name: 'Daily Review',
                user_id: user.id,
                recurring_parent_id: recurringTemplate.id,
                due_date: twoDaysAgo,
                status: 0,
            });

            // Create a future recurring task instance
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const futureInstance = await Task.create({
                name: 'Daily Review',
                user_id: user.id,
                recurring_parent_id: recurringTemplate.id,
                due_date: tomorrow,
                status: 0,
            });

            const response = await agent.get(
                '/api/tasks?include_instances=true'
            );

            expect(response.status).toBe(200);
            expect(response.body.tasks).toBeDefined();

            const taskIds = response.body.tasks.map((t) => t.id);

            // Should not include past instances
            expect(taskIds).not.toContain(pastInstance.id);

            // Should include future instances
            expect(taskIds).toContain(futureInstance.id);

            // Template should not be included because it's in the past
            expect(taskIds).not.toContain(recurringTemplate.id);
        });
    });
});
