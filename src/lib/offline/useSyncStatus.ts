import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { offlineDb, type QueuedWrite } from './db'

/**
 * Derives pending/failed counts directly from the Dexie queue (single source of
 * truth) rather than a separate event stream — a failed write that later syncs
 * successfully just disappears from the table, so there's nothing to reconcile.
 */
export function useSyncStatus() {
  const [writes, setWrites] = useState<QueuedWrite[]>([])

  useEffect(() => {
    const subscription = liveQuery(() => offlineDb.queuedWrites.toArray()).subscribe({
      next: setWrites,
    })
    return () => subscription.unsubscribe()
  }, [])

  return {
    pendingCount: writes.filter((w) => w.status === 'pending' || w.status === 'syncing').length,
    failures: writes.filter((w) => w.status === 'failed'),
  }
}
