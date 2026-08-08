/**
 * Offline Queue — IndexedDB-backed
 *
 * When the user loses connectivity, drawing operations are pushed to a local
 * IndexedDB queue.  On reconnection, useOfflineSync() drains the queue and
 * replays each operation through the socket.
 *
 * Schema:
 *   DB: whiteboard_offline  (v1)
 *   Store: pending_ops
 *     key:   op.id (UUID)
 *     value: DrawOperation & { queuedAt: number }
 */

import { openDB, IDBPDatabase } from 'idb';
import type { DrawOperation } from '@/types';

const DB_NAME = 'whiteboard_offline';
const DB_VERSION = 1;
const STORE = 'pending_ops';

type QueuedOp = DrawOperation & { queuedAt: number };

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    },
  });
  return _db;
}

/** Add an operation to the offline queue */
export async function enqueueOperation(op: DrawOperation): Promise<void> {
  const db = await getDB();
  await db.put(STORE, { ...op, queuedAt: Date.now() } satisfies QueuedOp);
}

/** Return all pending operations sorted by queuedAt ascending */
export async function getPendingOperations(): Promise<QueuedOp[]> {
  const db = await getDB();
  const all = await db.getAll(STORE) as QueuedOp[];
  return all.sort((a, b) => a.queuedAt - b.queuedAt);
}

/** Remove a single operation (after successful replay) */
export async function removeOperation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

/** Clear all pending operations for a room */
export async function clearRoomQueue(roomId: string): Promise<void> {
  const db = await getDB();
  const all = await db.getAll(STORE) as QueuedOp[];
  const tx = db.transaction(STORE, 'readwrite');
  await Promise.all(
    all.filter((op) => op.roomId === roomId).map((op) => tx.store.delete(op.id)),
  );
  await tx.done;
}

/** Return the count of pending operations */
export async function pendingCount(roomId?: string): Promise<number> {
  const db = await getDB();
  if (!roomId) return db.count(STORE);
  const all = await db.getAll(STORE) as QueuedOp[];
  return all.filter((op) => op.roomId === roomId).length;
}
