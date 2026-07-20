import { celsiusToFahrenheit } from '../../types/visit'

export interface Vitals {
  temperature_celsius: number | null
  bp_systolic: number | null
  bp_diastolic: number | null
  pulse_bpm: number | null
  oxygen_saturation: number | null
}

interface VitalsFormProps {
  vitals: Vitals
  onChange: (vitals: Vitals) => void
}

/** F-3.3: all fields optional. Temperature stored/entered in Celsius, shown in both units. */
export function VitalsForm({ vitals, onChange }: VitalsFormProps) {
  function setField<K extends keyof Vitals>(key: K, raw: string) {
    const value = raw === '' ? null : Number(raw)
    onChange({ ...vitals, [key]: value })
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Vitals (optional)</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-gray-700">Temperature (°C)</span>
          <input
            type="number"
            step="0.1"
            value={vitals.temperature_celsius ?? ''}
            onChange={(e) => setField('temperature_celsius', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
          {vitals.temperature_celsius !== null && (
            <span className="text-xs text-gray-500">
              {celsiusToFahrenheit(vitals.temperature_celsius)}°F
            </span>
          )}
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Pulse (bpm)</span>
          <input
            type="number"
            value={vitals.pulse_bpm ?? ''}
            onChange={(e) => setField('pulse_bpm', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">BP systolic</span>
          <input
            type="number"
            value={vitals.bp_systolic ?? ''}
            onChange={(e) => setField('bp_systolic', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">BP diastolic</span>
          <input
            type="number"
            value={vitals.bp_diastolic ?? ''}
            onChange={(e) => setField('bp_diastolic', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Oxygen saturation (%)</span>
          <input
            type="number"
            value={vitals.oxygen_saturation ?? ''}
            onChange={(e) => setField('oxygen_saturation', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
      </div>
    </div>
  )
}
