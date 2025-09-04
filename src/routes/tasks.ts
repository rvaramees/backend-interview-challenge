import { Router, Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';

export function createTaskRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);

  // Get all tasks
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const tasks = await taskService.getAllTasks();
      return res.json(tasks);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get single task
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const task = await taskService.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.json(task);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // Create task
  router.post('/', async (req: Request, res: Response) => {
    // TODO: Implement task creation endpoint
    // 1. Validate request body
    // 2. Call taskService.createTask()
    // 3. Return created task
    const {title, description} = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });    
    }
    try{
      const newTask = await taskService.createTask({title, description});
      return res.status(201).json(newTask);
    }catch (error) {
      return res.status(500).json({ error: 'Failed to create task' });    
    }
  });

  // Update task
  router.put('/:id', async (req: Request, res: Response) => {
    // TODO: Implement task update endpoint
    // 1. Validate request body
    // 2. Call taskService.updateTask()
    // 3. Handle not found case
    // 4. Return updated task
    const {id} = req.params;
    const updateDetails = req.body;
    if(!updateDetails || (typeof updateDetails !== 'object')){
      return res.status(400).json({ error: 'Update details are required' });
    }
    try{
      const updatedTask = await taskService.updateTask(id, updateDetails);
      if(!updatedTask){
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.json(updatedTask);
    }catch (error) {
      return res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // Delete task
  router.delete('/:id', async (req: Request, res: Response) => {
    // TODO: Implement task deletion endpoint
    // 1. Call taskService.deleteTask()
    // 2. Handle not found case
    // 3. Return success response
    const {id} = req.params;
    try{
      const ifDeleted = await taskService.deleteTask(id);
      if(!ifDeleted){
        return res.status(404).json({ error: 'Task not found' });
      }

      return res.json({
        success : true
      });
    }catch (error) {
      return res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  return router;
}