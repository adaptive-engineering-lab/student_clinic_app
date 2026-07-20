export type ChiefComplaint =
  | 'headache'
  | 'stomach pain'
  | 'injury'
  | 'fever'
  | 'allergic reaction'
  | 'anxiety/emotional'
  | 'medication administration'
  | 'vision/hearing check'
  | 'other'

export type ActionTaken =
  | 'rest provided'
  | 'ice applied'
  | 'medication administered'
  | 'wound cleaned/dressed'
  | 'emergency services called'
  | 'parent/guardian contacted'
  | 'referred to doctor'
  | 'other'

export type Disposition =
  'returned_to_class' | 'sent_home' | 'emergency_transport' | 'still_in_clinic'

export type ContactMethod = 'call' | 'text' | 'email'
export type ContactOutcome = 'reached' | 'no answer' | 'left voicemail' | 'sent message'

export interface Visit {
  id: string
  student_id: string
  nurse_id: string
  visited_at: string
  chief_complaint: ChiefComplaint
  chief_complaint_notes: string | null
  temperature_celsius: number | null
  bp_systolic: number | null
  bp_diastolic: number | null
  pulse_bpm: number | null
  oxygen_saturation: number | null
  assessment: string | null
  actions_taken: ActionTaken[] | null
  disposition: Disposition
  parent_contacted: boolean
  parent_contact_log: {
    contact_name?: string
    contact_method?: ContactMethod
    contact_time?: string
    outcome?: ContactOutcome
    notes?: string
  } | null
  created_at: string
  updated_at: string
}

/**
 * `id` and `nurse_id` have no DB default we rely on — the client generates `id` up
 * front (crypto.randomUUID()) so the same row can be edited again before it syncs
 * (Constitution Principle III), and `nurse_id` must be the current user's id.
 */
export type NewVisit = Omit<Visit, 'created_at' | 'updated_at'>

export function celsiusToFahrenheit(celsius: number): number {
  return Math.round(((celsius * 9) / 5 + 32) * 10) / 10
}
