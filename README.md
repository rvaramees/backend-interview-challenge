# Offline Task Sync Backend By MOHAMMED RAMEES

This backend powers a personal productivity app designed for users in India, where internet connectivity can often be unstable.
It ensures tasks can be created and managed offline, then synced automatically when a connection is available.

## Features

- Offline-first: Create, update, and delete tasks without internet.
- Sync Queue: All offline changes are added to a queue for later sync.
- Batch Syncing: Changes are sent in batches when online.
- Conflict Resolution: Handles conflicts between local and server tasks.
- Multi-Device Access: Keep tasks consistent across devices.
- Data Safety: Prevents data loss with retry mechanisms.



## Sync Flow

1. Add to Sync Queue  
   When a user updates a task offline, it is added to the sync queue.

2. Sync Service  
   On reconnect, the service processes queued items in batches, sending them to the server, updating statuses, and resolving conflicts.

## Conflict Handling

A simple strategy: pick the most recently updated version between the local and server tasks.

## Development Notes

- Implement retry with exponential backoff  
- Improve conflict resolution strategies  
- Add tests for batch sync and edge cases  
- Support partial batch failures  
- Enhance logging and monitoring

This setup ensures users can stay productive anywhere — offline changes are never lost, and everything stays in sync across devices.
