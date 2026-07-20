import { describe, expect, it, beforeEach } from 'vitest'
import {
  appendEntry,
  loadHistory,
  saveHistory,
} from '../../../src/lib/navigation/navigationHistoryStore'
import { NAV_HISTORY_MAX_ENTRIES, NAV_HISTORY_VERSION } from '../../../src/types/navigation'
import type { NavigationEntry } from '../../../src/types/navigation'

function entry(path: string, visitedAt = '2026-07-20T00:00:00.000Z'): NavigationEntry {
  return { path, label: path, visitedAt }
}

describe('navigationHistoryStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns null when nothing is stored', () => {
    expect(loadHistory('user-1')).toBeNull()
  })

  it('round-trips a saved record for the same user', () => {
    const record = appendEntry(null, 'user-1', entry('/students'))
    saveHistory(record)

    const loaded = loadHistory('user-1')
    expect(loaded?.entries).toEqual([entry('/students')])
  })

  it('isolates history per user (FR-013)', () => {
    saveHistory(appendEntry(null, 'user-1', entry('/students')))
    saveHistory(appendEntry(null, 'user-2', entry('/reports')))

    expect(loadHistory('user-1')?.entries).toEqual([entry('/students')])
    expect(loadHistory('user-2')?.entries).toEqual([entry('/reports')])
  })

  it('discards a record belonging to a different user', () => {
    const record = appendEntry(null, 'user-1', entry('/students'))
    window.localStorage.setItem('nav-history:user-2', JSON.stringify(record))

    expect(loadHistory('user-2')).toBeNull()
  })

  it('discards a record with a mismatched schema version', () => {
    window.localStorage.setItem(
      'nav-history:user-1',
      JSON.stringify({ ...appendEntry(null, 'user-1', entry('/students')), version: NAV_HISTORY_VERSION + 1 }),
    )

    expect(loadHistory('user-1')).toBeNull()
  })

  it('discards malformed JSON instead of throwing', () => {
    window.localStorage.setItem('nav-history:user-1', '{not valid json')

    expect(() => loadHistory('user-1')).not.toThrow()
    expect(loadHistory('user-1')).toBeNull()
  })

  it('caps entries at NAV_HISTORY_MAX_ENTRIES, dropping the oldest first', () => {
    let record = appendEntry(null, 'user-1', entry('/seed'))
    for (let i = 0; i < NAV_HISTORY_MAX_ENTRIES + 5; i++) {
      record = appendEntry(record, 'user-1', entry(`/path-${i}`))
    }
    saveHistory(record)

    const loaded = loadHistory('user-1')
    expect(loaded?.entries.length).toBe(NAV_HISTORY_MAX_ENTRIES)
    expect(loaded?.entries[0].path).toBe(`/path-5`)
  })
})
