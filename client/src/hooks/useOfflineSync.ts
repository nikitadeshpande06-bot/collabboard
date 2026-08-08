import { useEffect, useRef } from 'react';
import { getSocket } from '@/services/socket';
import { getPendingOperations, removeOperation } from '@/offline/queue';
import type { DrawOperation } from '@/types';

/**
 * useOfflineSync
 *
 * Watches navigator.onLine.  When the connection is restored it:
 *   1. Drains the IndexedDB pending-ops queue
 *   2. Re-emits each operation through Socket.IO in chronological order
 *   3. Removes each op from the queue after successful emission
 *
 * A small delay between ops prevents flooding the server.
 */
export function useOfflineSync(roomId: string | undefined): void {
  const isSyncing = useRef(false);

  useEffect(() => {
    if (!roomId) return;

    async function sync(): Promise<void> {
      if (isSyncing.current) return;
      isSyncing.current = true;

      try {
        const pending = await getPendingOperations();
        const forRoom = pending.filter((op) => op.roomId === roomId);
        if (!forRoom.length) return;

        console.info(`[OfflineSync] Replaying ${forRoom.length} queued operations`);
        const socket = getSocket();
        if (!socket) return;

        for (const op of forRoom) {
          socket.emit('draw:operation', op as DrawOperation);
          await removeOperation(op.id);
          // Yield to event loop between each emit
          await new Promise<void>((r) => setTimeout(r, 30));
        }

        console.info('[OfflineSync] Sync complete');
      } catch (err) {
        console.error('[OfflineSync] Failed to sync', err);
      } finally {
        isSyncing.current = false;
      }
    }

    window.addEventListener('online', sync);
    // Also try immediately (in case we just connected for the first time)
    if (navigator.onLine) sync();

    return () => window.removeEventListener('online', sync);
  }, [roomId]);
}
