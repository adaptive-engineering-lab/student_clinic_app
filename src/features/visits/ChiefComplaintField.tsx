import type { ChiefComplaint } from '../../types/visit'

const COMPLAINTS: ChiefComplaint[] = [
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

interface ChiefComplaintFieldProps {
  complaint: ChiefComplaint
  onComplaintChange: (value: ChiefComplaint) => void
  notes: string
  onNotesChange: (value: string) => void
}

/** F-3.2: picklist + always-available free text. */
export function ChiefComplaintField({
  complaint,
  onComplaintChange,
  notes,
  onNotesChange,
}: ChiefComplaintFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm text-gray-700">Chief complaint</span>
        <select
          value={complaint}
          onChange={(e) => onComplaintChange(e.target.value as ChiefComplaint)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          {COMPLAINTS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-gray-700">Details</span>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
    </div>
  )
}
