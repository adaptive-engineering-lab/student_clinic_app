import { flushQueue } from '../lib/offline/sync'
import { useSyncStatus } from '../lib/offline/useSyncStatus'

/**
 * Offline-first reliability (Constitution Principle III) requires this to be
 * visible app-wide, not just on the form that made the write — a queued visit
 * enqueued from /visits/new must still show as pending after navigating away.
 * Sync failures persist here until a retry succeeds; they are never silently
 * dropped (FR-025).
 */
export function SyncStatusBanner() {
  const { pendingCount, failures } = useSyncStatus()

  if (pendingCount === 0 && failures.length === 0) return null

  return (
    <div className="space-y-2 border-b bg-gray-50 px-6 py-2 text-sm">
      {pendingCount > 0 && (
        <p className="text-gray-600" data-testid="sync-pending-indicator">
          {pendingCount} change{pendingCount === 1 ? '' : 's'} pending sync…
        </p>
      )}
      {failures.length > 0 && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded border-2 border-red-700 bg-red-100 p-2 text-red-900"
        >
          <span>
            {failures.length} change{failures.length === 1 ? '' : 's'} failed to sync and{' '}
            {failures.length === 1 ? 'is' : 'are'} still saved locally — nothing has been lost.
          </span>
          <button
            type="button"
            onClick={() => void flushQueue()}
            className="rounded border border-red-700 px-2 py-1 text-xs whitespace-nowrap"
          >
            Retry sync
          </button>
        </div>
      )}
    </div>
  )
}
