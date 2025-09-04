import { Router, Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';

export function createSyncRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db, taskService);

  // Trigger manual sync
  router.post('/sync', async (_req: Request, res: Response) => {
    // TODO: Implement sync endpoint
    // 1. Check connectivity first
    // 2. Call syncService.sync()
    // 3. Return sync result
    try{
    const checkConnectivity = await syncService.checkConnectivity();
    if(!checkConnectivity){
      return res.status(503).json({ error: 'Cannot reach server for synchronization' });
    }
    const result = await syncService.sync();
    return res.json(result);
  }catch (error) {
    return res.status(500).json({ error: 'Synchronization failed' });
  }
  });

  // Check sync status
  router.get('/status', async (_req: Request, res: Response) => {
    // TODO: Implement sync status endpoint
    // 1. Get pending sync count
    // 2. Get last sync timestamp
    // 3. Check connectivity
    // 4. Return status summary
    try{
      const pendingItems = await db.all(`SELECT COUNT(*) as count FROM SYNC_QUEUE WHERE retry_count < 3`)
      const lastSyncedItem = await db.get(`SELECT MAX(last_synced_at) as last_synced_at FROM TASKS`);
      const connectivity = await syncService.checkConnectivity();
      return res.json({
        pendingItems: pendingItems[0].count,
        lastSyncedAt: lastSyncedItem.last_synced_at,
        connectivity
      });
    }catch (error) {
      return res.status(500).json({ error: 'Failed to retrieve sync status' });
    }
  });

  // Batch sync endpoint (for server-side)
  router.post('/batch', async (req: Request, res: Response) => {
    // TODO: Implement batch sync endpoint
    // This would be implemented on the server side
    // to handle batch sync requests from clients
    const {items} = req.body;
    if(!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid request Batch sync' });
    }
    const mapItems = items.map((item: any) => ({
      client_id: item.task.id,
      server_id: 'srvr_' + item.task.id,
      status: 'success',
    }));
    return res.json({ mapItems });  
  });

  // Health check endpoint
  router.get('/health', async (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });
    
  return router;
}