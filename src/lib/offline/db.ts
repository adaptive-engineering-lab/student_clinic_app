import Dexie, { type EntityTable } from 'dexie'

export type QueuedEntityType = 'visit' | 'medication_administration' | 'communication_log'
export type QueuedOperation = 'insert' | 'update'
export type QueuedWriteStatus = 'pending' | 'syncing' | 'failed'

export interface QueuedWrite {
  id?: number
  entityType: QueuedEntityType
  operation: QueuedOperation
  /** Client-generated id so the same record can be updated again before it syncs. */
  localId: string
  payload: Record<string, unknown>
  /** Used to flush writes in chronological order (Constitution Principle III). */
  clientTimestamp: number
  status: QueuedWriteStatus
  errorMessage?: string
}

/**
 * Minimal read cache for offline student/medication lookups. The PWA service worker
 * (vite.config.ts) already caches raw Supabase HTTP responses; this table exists for
 * structured offline querying (e.g. roster search) rather than duplicating that cache.
 */
export interface CachedStudent {
  id: string
  data: Record<string, unknown>
  cachedAt: number
}

class OfflineDatabase extends Dexie {
  queuedWrites!: EntityTable<QueuedWrite, 'id'>
  cachedStudents!: EntityTable<CachedStudent, 'id'>

  constructor() {
    super('school-nurse-offline')
    this.version(1).stores({
      queuedWrites: '++id, entityType, status, clientTimestamp',
      cachedStudents: 'id, cachedAt',
    })
  }
}

export const offlineDb = new OfflineDatabase()
