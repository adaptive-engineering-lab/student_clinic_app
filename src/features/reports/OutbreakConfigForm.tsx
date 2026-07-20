import { useEffect, useState } from 'react'
import { useOutbreakAlertConfig } from './useOutbreakAlertConfig'

/** super_admin-only threshold/window configuration for outbreak alerts (FR-022). */
export function OutbreakConfigForm() {
  const { config, loading, error, save } = useOutbreakAlertConfig()
  const [threshold, setThreshold] = useState(5)
  const [windowHours, setWindowHours] = useState(72)
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config) {
      setThreshold(config.threshold)
      setWindowHours(config.window_hours)
    }
  }, [config])

  if (loading) return null
  if (error)
    return (
      <p role="alert" className="text-sm text-red-600">
        Failed to load outbreak config: {error}
      </p>
    )

  return (
    <div className="space-y-3 rounded border p-4" data-testid="outbreak-config-form">
      <h3 className="font-semibold">Outbreak alert configuration</h3>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          Threshold (students)
          <input
            type="number"
            min={1}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-20 rounded border px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          Window (hours)
          <input
            type="number"
            min={1}
            value={windowHours}
            onChange={(e) => setWindowHours(Number(e.target.value))}
            className="w-20 rounded border px-2 py-1"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            const result = await save(threshold, windowHours)
            setSaving(false)
            setStatus(result.ok ? 'Saved.' : `Failed: ${result.error}`)
          }}
          className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {status && (
        <p role="status" className="text-sm text-gray-700">
          {status}
        </p>
      )}
    </div>
  )
}
