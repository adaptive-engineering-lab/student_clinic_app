import { supabase } from '../supabase'
import { offlineDb, type QueuedEntityType, type QueuedOperation } from './db'

/** Maps a queued entity type to the Supabase table it's written to. */
const TABLE_BY_ENTITY: Record<QueuedEntityType, string> = {
  visit: 'visits',
  medication_administration: 'medication_administrations',
  communication_log: 'communication_log',
}

/** Maps a partial visit payload to update_visit()'s positional RPC args. */
function visitPatchToRpcArgs(visitId: string, payload: Record<string, unknown>) {
  return {
    p_visit_id: visitId,
    p_chief_complaint: payload.chief_complaint ?? null,
    p_chief_complaint_notes: payload.chief_complaint_notes ?? null,
    p_temperature_celsius: payload.temperature_celsius ?? null,
    p_bp_systolic: payload.bp_systolic ?? null,
    p_bp_diastolic: payload.bp_diastolic ?? null,
    p_pulse_bpm: payload.pulse_bpm ?? null,
    p_oxygen_saturation: payload.oxygen_saturation ?? null,
    p_assessment: payload.assessment ?? null,
    p_actions_taken: payload.actions_taken ?? null,
    p_disposition: payload.disposition ?? null,
    p_parent_contacted: payload.parent_contacted ?? null,
    p_parent_contact_log: payload.parent_contact_log ?? null,
  }
}

export interface SyncFailure {
  localId: string
  entityType: QueuedEntityType
  errorMessage: string
}

type SyncFailureListener = (failure: SyncFailure) => void

const failureListeners = new Set<SyncFailureListener>()

/** Subscribe to sync failures so the UI can show a persistent notification (FR-025, Constitution Principle III). */
export function onSyncFailure(listener: SyncFailureListener): () => void {
  failureListeners.add(listener)
  return () => failureListeners.delete(listener)
}

/** Queue a write for later sync. Safe to call while offline or online. */
export async function enqueueWrite(
  entityType: QueuedEntityType,
  operation: QueuedOperation,
  localId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await offlineDb.queuedWrites.add({
    entityType,
    operation,
    localId,
    payload,
    clientTimestamp: Date.now(),
    status: 'pending',
  })
}

let flushInFlight = false
let rerunRequested = false

/**
 * Flush all pending writes to Supabase in chronological order (Constitution
 * Principle III). Safe to call repeatedly (e.g. on 'online' events) — a call that
 * arrives while a flush is already running doesn't just no-op: it schedules one more
 * pass immediately after the current one finishes, so a write enqueued mid-flush
 * (e.g. a medication administration enqueued right after its triggering visit) is
 * never left stranded until some unrelated future trigger.
 */
export async function flushQueue(): Promise<void> {
  if (flushInFlight) {
    rerunRequested = true
    return
  }
  flushInFlight = true

  try {
    const pending = await offlineDb.queuedWrites
      .where('status')
      .anyOf(['pending', 'failed'])
      .sortBy('clientTimestamp')

    for (const write of pending) {
      if (write.id === undefined) continue

      await offlineDb.queuedWrites.update(write.id, { status: 'syncing' })

      const table = TABLE_BY_ENTITY[write.entityType]
      // `visits` has no SELECT grant (read-audited), and PostgREST's `UPDATE ... WHERE`
      // requires SELECT on the filtered column even with return=minimal — so visit
      // updates go through update_visit() instead of a direct table update.
      const { error } =
        write.operation === 'insert'
          ? await supabase.from(table).insert(write.payload)
          : write.entityType === 'visit'
            ? await supabase.rpc('update_visit', visitPatchToRpcArgs(write.localId, write.payload))
            : await supabase.from(table).update(write.payload).eq('id', write.localId)

      if (error) {
        await offlineDb.queuedWrites.update(write.id, {
          status: 'failed',
          errorMessage: error.message,
        })
        for (const listener of failureListeners) {
          listener({
            localId: write.localId,
            entityType: write.entityType,
            errorMessage: error.message,
          })
        }
        continue
      }

      await offlineDb.queuedWrites.delete(write.id)
    }
  } finally {
    flushInFlight = false
    if (rerunRequested) {
      rerunRequested = false
      void flushQueue()
    }
  }
}

/** Wire up automatic flush-on-reconnect. Call once at app startup. */
export function registerSyncOnReconnect(): () => void {
  const handler = () => {
    void flushQueue()
  }
  window.addEventListener('online', handler)
  if (navigator.onLine) void flushQueue()
  return () => window.removeEventListener('online', handler)
}
