import type { ChiefComplaint, Disposition } from '../../types/visit'
import type { ReportFilterValues } from '../../types/report'

interface ReportFiltersProps {
  values: ReportFilterValues
  onChange: (values: ReportFilterValues) => void
}

const CHIEF_COMPLAINTS: ChiefComplaint[] = [
  'headache',
  'stomach pain',
  'injury',
  'fever',
  'allergic reaction',
  'anxiety/emotional',
  'medication administration',
  'vision/hearing check',
  'other',
]

const DISPOSITIONS: Disposition[] = [
  'returned_to_class',
  'sent_home',
  'emergency_transport',
  'still_in_clinic',
]

/** FR-017: shared filter set for both the nurse and admin-preview report views. */
export function ReportFilters({ values, onChange }: ReportFiltersProps) {
  function set<K extends keyof ReportFilterValues>(key: K, value: ReportFilterValues[K]) {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="grid grid-cols-2 gap-3 rounded border p-3 md:grid-cols-3">
      <label className="block">
        <span className="text-sm text-gray-700">Date from</span>
        <input
          type="date"
          value={values.date_from ?? ''}
          onChange={(e) => set('date_from', e.target.value || null)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-700">Date to</span>
        <input
          type="date"
          value={values.date_to ?? ''}
          onChange={(e) => set('date_to', e.target.value || null)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-700">Grade</span>
        <input
          value={values.grade ?? ''}
          onChange={(e) => set('grade', e.target.value || null)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-700">Homeroom</span>
        <input
          value={values.homeroom ?? ''}
          onChange={(e) => set('homeroom', e.target.value || null)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-700">Chief complaint</span>
        <select
          value={values.chief_complaint ?? ''}
          onChange={(e) => set('chief_complaint', e.target.value || null)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">Any</option>
          {CHIEF_COMPLAINTS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-gray-700">Disposition</span>
        <select
          value={values.disposition ?? ''}
          onChange={(e) => set('disposition', e.target.value || null)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">Any</option>
          {DISPOSITIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
