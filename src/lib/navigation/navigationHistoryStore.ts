import {
  NAV_HISTORY_MAX_ENTRIES,
  NAV_HISTORY_VERSION,
  type NavigationEntry,
  type NavigationHistoryRecord,
} from '../../types/navigation'

const KEY_PREFIX = 'nav-history:'

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${userId}`
}

/** Private browsing / storage-disabled contexts throw on access, not just on quota. */
function isLocalStorageAvailable(): boolean {
  try {
    const probeKey = '__nav_history_probe__'
    window.localStorage.setItem(probeKey, '1')
    window.localStorage.removeItem(probeKey)
    return true
  } catch {
    return false
  }
}

/**
 * Returns null (never throws) for: no stored record, a record for a different user,
 * a schema version mismatch, or malformed JSON — all treated as "start fresh" per
 * data-model.md Validation Rules.
 */
export function loadHistory(userId: string): NavigationHistoryRecord | null {
  if (!isLocalStorageAvailable()) return null

  const raw = window.localStorage.getItem(keyFor(userId))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as NavigationHistoryRecord
    if (parsed.userId !== userId) return null
    if (parsed.version !== NAV_HISTORY_VERSION) return null
    if (!Array.isArray(parsed.entries)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveHistory(record: NavigationHistoryRecord): void {
  if (!isLocalStorageAvailable()) return

  const capped: NavigationHistoryRecord = {
    ...record,
    entries: record.entries.slice(-NAV_HISTORY_MAX_ENTRIES),
  }

  try {
    window.localStorage.setItem(keyFor(record.userId), JSON.stringify(capped))
  } catch {
    // Quota exceeded or storage revoked mid-session — skip silently; the caller's
    // in-memory state stays correct for the rest of this session regardless.
  }
}

export function appendEntry(
  existing: NavigationHistoryRecord | null,
  userId: string,
  entry: NavigationEntry,
): NavigationHistoryRecord {
  const entries = existing && existing.userId === userId ? existing.entries : []
  return {
    userId,
    version: NAV_HISTORY_VERSION,
    entries: [...entries, entry],
    updatedAt: entry.visitedAt,
  }
}
