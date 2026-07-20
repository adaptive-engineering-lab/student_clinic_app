import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { enqueueWrite, flushQueue } from '../../lib/offline/sync'
import type { NewVisit } from '../../types/visit'

type VisitInput = Omit<NewVisit, 'id' | 'nurse_id'>

export interface SavedVisit {
  id: string
  nurseId: string
}

/**
 * Saves a visit through the offline write queue (Constitution Principle III) rather
 * than a direct insert — the same code path handles both online and offline saves,
 * so there is only one sync/consistency story to reason about. When online, the
 * immediate flushQueue() call means the write reaches Supabase right away; when
 * offline, it stays queued until reconnect (src/lib/offline/sync.ts).
 */
export function useSaveVisit() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveVisit(input: VisitInput): Promise<SavedVisit | null> {
    setSaving(true)
    setError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      setError('Not signed in.')
      setSaving(false)
      return null
    }

    const id = crypto.randomUUID()
    const payload: NewVisit = { id, nurse_id: session.user.id, ...input }

    await enqueueWrite('visit', 'insert', id, payload as unknown as Record<string, unknown>)
    void flushQueue()

    setSaving(false)
    return { id, nurseId: session.user.id }
  }

  return { saveVisit, saving, error }
}
