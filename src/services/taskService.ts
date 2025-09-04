import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';
import { Database } from '../db/database';

export class TaskService {
  constructor(private db: Database) {}

  async createTask(taskData: Partial<Task>): Promise<Task> {
    // TODO: Implement task creation
    // 1. Generate UUID for the task
    // 2. Set default values (completed: false, is_deleted: false)
    // 3. Set sync_status to 'pending'
    // 4. Insert into database
    // 5. Add to sync queue
    const newId = uuidv4();
    const nowDate = new Date();
    const task: Task = {
      id: newId,
      title: taskData.title! ,
      description: taskData.description || '',
      completed: false,
      updated_at: nowDate,
      created_at: nowDate,
      is_deleted: false,
      sync_status: 'pending',
      server_id: undefined,
      last_synced_at: undefined
    };

    // Add to tasks table
    await this.db.run(`
      INSERT INTO tasks (id, title, description, completed, updated_at, created_at, is_deleted, sync_status, server_id, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [task.id, task.title, task.description, 0, nowDate.toISOString(), nowDate.toISOString(), 0, 'pending', task.server_id, task.last_synced_at]
    );

    // Add to Sync Queue Table
    await this.db.run(`
      INSERT INTO SYNC_QUEUE (id, task_id, operation, data, created_at, retry_count, error_message) 
      VALUES (?, ?, ?, ?, ?, ?, 0) 
      `,
      [uuidv4(), task.id, 'create', JSON.stringify(task), nowDate.toISOString()]
    );

    // Return the created task
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    // TODO: Implement task update
    // 1. Check if task exists
    // 2. Update task in database
    // 3. Update updated_at timestamp
    // 4. Set sync_status to 'pending'
    // 5. Add to sync queue
    const taskToUpdate = await this.db.get(`
      SELECT * FROM TASKS WHERE id = ? AND is_deleted = 0`, [id]);  
      if(!taskToUpdate) return null;
      const nowDate = new Date();
      const updatedTask: Task = {...taskToUpdate, ...updates, updated_at: nowDate.toISOString(), sync_status: 'pending'}

      // Update task in Tasks table
      await this.db.run(`
        UPDATE TASKS SET title = ?, description = ?, completed = ?, updated_at = ?, sync_status = ? WHERE id = ?`, 
        [updatedTask.title, updatedTask.description, updatedTask.completed ? 1 : 0, updatedTask.updated_at, updatedTask.sync_status, id]
      );

      // Add to Sync Queue Table
      await this.db.run(`
        INSERT INTO SYNC_QUEUE (id, task_id, operation, data, created_at, retry_count) 
        VALUES (?, ?, ?, ?, ?, 0)`,
        [uuidv4(), updatedTask.id, 'update', JSON.stringify(updatedTask), nowDate.toISOString()]
      );

      return {...updatedTask, completed: !!updatedTask.completed, is_deleted: !!updatedTask.is_deleted};
}

  async deleteTask(id: string): Promise<boolean> {
    // TODO: Implement soft delete
    // 1. Check if task exists
    // 2. Set is_deleted to true
    // 3. Update updated_at timestamp
    // 4. Set sync_status to 'pending'
    // 5. Add to sync queue
    const taskToDelete = await this.db.get(`
      SELECT * FROM TASKS WHERE id = ? AND is_deleted = 0`, [id]);
      if(!taskToDelete) return false;
      const nowDate = new Date();

      // Soft delete in Tasks table
      await this.db.run(`
        UPDATE TASKS SET is_deleted = 1, updated_at = ?, sync_status = ? WHERE id = ?`, [nowDate.toISOString(), 'pending', id]);
      
      // Add to Sync Queue Table
      await this.db.run(`
        INSERT INTO SYNC_QUEUE (id, task_id, operation, data, created_at, retry_count)
        VALUES (?, ?, ?, ?, ?, 0)`, [uuidv4(), id, 'delete', JSON.stringify(taskToDelete), nowDate.toISOString()]);
      return true;
  }

  async getTask(id: string): Promise<Task | null> {
    // TODO: Implement get single task
    // 1. Query database for task by id
    // 2. Return null if not found or is_deleted is true
    const task = await this.db.get(`
      SELECT * FROM TASKS WHERE id = ? AND is_deleed = 0`, [id]
    );
    if(!task || task.is_deleted) return null;
    return {...task, completed: !!task.completed, is_deleted: !!task.is_deleted, };
  }

  async getAllTasks(): Promise<Task[]> {
    // TODO: Implement get all non-deleted tasks
    // 1. Query database for all tasks where is_deleted = false
    // 2. Return array of tasks
    const allTasks = await this.db.all(`
      SELECT * FROM TASKS WHERE is_deleted = 0`
    );
    return allTasks.map(task => ({...task, completed: !!task.completed, is_deleted: !!task.is_deleted, }));
  }

  async getTasksNeedingSync(): Promise<Task[]> {
    // TODO: Get all tasks with sync_status = 'pending' or 'error'
    const tasksNeedSync = await this.db.all(`
      SELECT * FROM TASKS WHERE sync_status IN ('pending', 'error') AND is_deleted = 0`
    );
    return tasksNeedSync.map(task => ({...task, completed: !!task.completed, is_deleted: !!task.is_deleted, }));
  }
}