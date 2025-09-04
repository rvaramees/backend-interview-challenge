import axios from 'axios';
import { Task, SyncQueueItem, SyncResult, BatchSyncRequest, BatchSyncResponse } from '../types';
import { Database } from '../db/database';
import { TaskService } from './taskService';

export class SyncService {
  private apiUrl: string;
  
  constructor(
    private db: Database,
    private taskService: TaskService,
    apiUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api'
  ) {
    this.apiUrl = apiUrl;
  }

  async sync(): Promise<SyncResult> {
    // TODO: Main sync orchestration method
    // 1. Get all items from sync queue
    // 2. Group items by batch (use SYNC_BATCH_SIZE from env)
    // 3. Process each batch
    // 4. Handle success/failure for each item
    // 5. Update sync status in database
    // 6. Return sync result summary

    // Get all items from sync queue
    const syncQueueItems:SyncQueueItem[] = 
    await this.db.all(`SELECT * FROM SYNC_QUEUE ORDER BY created_at ASC`);
    if(syncQueueItems.length === 0){
      return {
        success: true,
        synced_items: 0,
        failed_items: 0,
        errors: []
      };
    }
    const batchSize = parseInt(process.env.SYNC_BATCH_SIZE || '50', 10); // Default to 50 if not set
    let successCount = 0;
    let failureCount = 0;
    const errors: SyncResult['errors'] = [];
    for (let i = 0; i < syncQueueItems.length; i += batchSize) {
      const batch = syncQueueItems.slice(i, i + batchSize); // Get batch
      try {
        const batchResponse = await this.processBatch(batch);
        for (const itemResponse of batchResponse.processed_items) {
          const queueItem = batch.find(item => item.task_id === itemResponse.client_id);
          if (!queueItem) continue;
          if (itemResponse.status === 'success') {
            await this.updateSyncStatus(queueItem.task_id, 'synced', itemResponse.resolved_data);
            successCount++;
          } else if (itemResponse.status === 'conflict' && itemResponse.resolved_data) {
            const localTask = await this.taskService.getTask(queueItem.task_id);
            if (localTask) {
              const resolvedTask = await this.resolveConflict(localTask, itemResponse.resolved_data);
              await this.taskService.updateTask(resolvedTask.id, resolvedTask);
              await this.updateSyncStatus(resolvedTask.id, 'synced', resolvedTask);
              successCount++;
            }
          } else if (itemResponse.status === 'error' && itemResponse.error) {
            await this.handleSyncError(queueItem, new Error(itemResponse.error));
            failureCount++;
            errors.push({
              task_id: queueItem.task_id,
              operation: queueItem.operation,
              error: itemResponse.error,
              timestamp: new Date()
            });
          }
        }
      } catch (err) {
        // Handle batch-level error
        for (const item of batch) {
          await this.handleSyncError(item, err as Error);
          failureCount++;
          errors.push({
            task_id: item.task_id,
            operation: item.operation,
            error: (err as Error).message,
            timestamp: new Date()
          });
        }
      }
    }
    return {
      success: failureCount === 0,
      synced_items: successCount,
      failed_items: failureCount,
      errors
    };
  }

  async addToSyncQueue(taskId: string, operation: 'create' | 'update' | 'delete', data: Partial<Task>): Promise<void> {
    // TODO: Add operation to sync queue
    // 1. Create sync queue item
    // 2. Store serialized task data
    // 3. Insert into sync_queue table

    // Create sync queue item
    const { v4: uuidv4 } = require('uuid');
    const now = new Date();
    await this.db.run(
      `INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count) VALUES (?, ?, ?, ?, ?, 0)`,
      [uuidv4(), taskId, operation, JSON.stringify(data), now.toISOString()]
    );
  }

  private async processBatch(items: SyncQueueItem[]): Promise<BatchSyncResponse> {
    // TODO: Process a batch of sync items
    // 1. Prepare batch request
    // 2. Send to server
    // 3. Handle response
    // 4. Apply conflict resolution if needed
    const batchRequest: BatchSyncRequest = {
      items,
      client_timestamp: new Date()
    } 
      const response =  await axios.post<BatchSyncResponse>(`${this.apiUrl}/sync/batch`, batchRequest)
      const batchResponse = response.data;
      return batchResponse as BatchSyncResponse;
  }

  private async resolveConflict(localTask: Task, serverTask: Task): Promise<Task> {
    // TODO: Implement last-write-wins conflict resolution
    // 1. Compare updated_at timestamps
    // 2. Return the more recent version
    // 3. Log conflict resolution decision
    const localUpdatedAt = new Date(localTask.updated_at);
    const serverUpdatedAt = new Date(serverTask.updated_at);
    if (localUpdatedAt > serverUpdatedAt) {
      return localTask;
    } else if (serverUpdatedAt > localUpdatedAt) {
      return serverTask;
    } else {
      // If timestamps are equal, prefer server version
      return serverTask;
    }    
  }

  private async updateSyncStatus(taskId: string, status: 'synced' | 'error', serverData?: Partial<Task>): Promise<void> {
    // TODO: Update task sync status
    // 1. Update sync_status field
    // 2. Update server_id if provided
    // 3. Update last_synced_at timestamp
    // 4. Remove from sync queue if successful
    const nowDate = new Date();
    let syncStatus = status;
    const serverId = serverData ? serverData.id : null;
    await this.db.run(`
      UPDATE TASKS SET sync_status = ?, server_id = ?, last_synced_at = ? WHERE id = ?`, 
      [syncStatus, serverId, nowDate.toISOString(), taskId]
    );
    if (status === 'synced') {
      await this.db.run(`DELETE FROM sync_queue WHERE task_id = ?`, [taskId]);
    }
  }

  private async handleSyncError(item: SyncQueueItem, error: Error): Promise<void> {
    // TODO: Handle sync errors
    // 1. Increment retry count
    // 2. Store error message
    // 3. If retry count exceeds limit, mark as permanent failure

    const { id, retry_count } = item;
    const retryCount = retry_count || 0;
    const maxRetries = 3; 
    if (retryCount + 1 >= maxRetries) {
      await this.updateSyncStatus(item.task_id, 'error');
      await this.db.run(`
        UPDATE sync_queue SET retry_count = ?, error_message = ? WHERE id = ?`,
        [retryCount + 1, 'Permanent failure', id]
      );
    }
    
  }

  async checkConnectivity(): Promise<boolean> {
    // TODO: Check if server is reachable
    // 1. Make a simple health check request
    // 2. Return true if successful, false otherwise
    try {
      await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
       return true;
  } catch {
    return false;
  }
  }
}
