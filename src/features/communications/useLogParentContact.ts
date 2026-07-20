import { useState } from 'react'
import { enqueueWrite, flushQueue } from '../../lib/offline/sync'
import type { NewCommunicationLogEntry } from '../../types/communication'

/**
 * Queues a communication_log entry through the same offline write queue as visits
 * (Constitution Principle III). Used both for the auto-created entry on a
 * parent-contacted visit save (FR-015) and for standalone entries logged from the
 * student profile (CommunicationLogForm) — the underlying write is identical either
 * way, only `visit_id` differs (set vs. null).
 */
export function useLogParentContact() {
  const [error, setError] = useState<string | null>(null)

  async function logParentContact(input: Omit<NewCommunicationLogEntry, 'id'>): Promise<boolean> {
    setError(null)
    const id = crypto.randomUUID()
    const payload: NewCommunicationLogEntry = { id, ...input }
    await enqueueWrite(
      'communication_log',
      'insert',
      id,
      payload as unknown as Record<string, unknown>,
    )
    void flushQueue()
    return true
  }

  return { logParentContact, error }
}
