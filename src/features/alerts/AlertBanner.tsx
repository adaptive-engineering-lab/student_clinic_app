import { isCriticalAlert, type MedicalAlert } from '../../types/student'

interface AlertBannerProps {
  alerts: MedicalAlert[]
}

/**
 * Full-width critical alert banner (F-2.3). Renders whenever a student has any
 * severe/life-threatening allergy or a condition flagged requires_immediate_action.
 * Must be the first thing rendered on a profile or new-visit screen (FR-005) —
 * callers are responsible for placement, this component only decides visibility.
 */
export function AlertBanner({ alerts }: AlertBannerProps) {
  const critical = alerts.filter(isCriticalAlert)
  if (critical.length === 0) return null

  return (
    <div
      role="alert"
      className="mb-4 w-full rounded border-2 border-red-700 bg-red-100 p-4 text-red-900"
    >
      <p className="font-bold">⚠ Critical medical alert</p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        {critical.map((alert) => (
          <li key={alert.id}>
            <span className="font-semibold">{alert.name}</span>
            {alert.type === 'allergy' && alert.subtype
              ? ` (${alert.subtype} allergy)`
              : null} — {alert.severity}
            {alert.epipen_on_file && alert.storage_location ? (
              <span> · Epipen: {alert.storage_location}</span>
            ) : null}
            {alert.inhaler_on_file && alert.storage_location ? (
              <span> · Inhaler: {alert.storage_location}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
