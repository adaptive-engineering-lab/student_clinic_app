import { useSession } from '../../lib/auth/useSession'
import { supabase } from '../../lib/supabase'
import { useOutbreakAlerts } from './useOutbreakAlerts'

/**
 * In-app outbreak alert for nurses (FR-021) — fires from the visits_outbreak_check
 * trigger (supabase/migrations/0025_outbreak_trigger.sql), so this banner only ever
 * displays already-raised, unresolved outbreak_alerts rows; it never runs the
 * threshold evaluation itself.
 */
export function OutbreakAlertBanner() {
  const { role } = useSession()
  const { alerts, loading, error, refetch } = useOutbreakAlerts()

  if (loading || error || alerts.length === 0) return null

  async function resolve(id: string) {
    await supabase.from('outbreak_alerts').update({ resolved: true }).eq('id', id)
    void refetch()
  }

  return (
    <div
      role="alert"
      className="mb-4 w-full rounded border-2 border-amber-600 bg-amber-50 p-4 text-amber-900"
    >
      <p className="font-bold">⚠ Outbreak alert</p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex items-center justify-between gap-2">
            <span>
              {alert.visit_count} students with <strong>{alert.complaint_type}</strong> in the past{' '}
              {alert.window_hours}h (threshold: {alert.threshold_used})
            </span>
            {role === 'super_admin' && (
              <button
                type="button"
                onClick={() => void resolve(alert.id)}
                className="rounded border border-amber-700 px-2 py-1 text-xs"
              >
                Resolve
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
