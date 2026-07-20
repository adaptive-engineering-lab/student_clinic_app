import type { ContactMethod, ContactOutcome } from '../../types/visit'

export interface ParentContactInfo {
  contact_name: string
  contact_method: ContactMethod
  contact_time: string
  outcome: ContactOutcome
  notes: string
}

interface ParentContactFieldsProps {
  contacted: boolean
  onContactedChange: (value: boolean) => void
  info: ParentContactInfo
  onInfoChange: (info: ParentContactInfo) => void
}

/** F-3.7: shown only when parent_contacted is toggled on. */
export function ParentContactFields({
  contacted,
  onContactedChange,
  info,
  onInfoChange,
}: ParentContactFieldsProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={contacted}
          onChange={(e) => onContactedChange(e.target.checked)}
        />
        <span className="text-sm text-gray-700">Parent/guardian contacted</span>
      </label>

      {contacted && (
        <div className="grid grid-cols-2 gap-3 rounded border p-3">
          <label className="block">
            <span className="text-sm text-gray-700">Contact name</span>
            <input
              required
              value={info.contact_name}
              onChange={(e) => onInfoChange({ ...info, contact_name: e.target.value })}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Method</span>
            <select
              value={info.contact_method}
              onChange={(e) =>
                onInfoChange({ ...info, contact_method: e.target.value as ContactMethod })
              }
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="call">call</option>
              <option value="text">text</option>
              <option value="email">email</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Outcome</span>
            <select
              value={info.outcome}
              onChange={(e) => onInfoChange({ ...info, outcome: e.target.value as ContactOutcome })}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="reached">reached</option>
              <option value="no answer">no answer</option>
              <option value="left voicemail">left voicemail</option>
              <option value="sent message">sent message</option>
            </select>
          </label>
          <label className="col-span-2 block">
            <span className="text-sm text-gray-700">Notes</span>
            <textarea
              value={info.notes}
              onChange={(e) => onInfoChange({ ...info, notes: e.target.value })}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        </div>
      )}
    </div>
  )
}
