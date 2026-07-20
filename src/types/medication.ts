export type MedicationForm = 'tablet' | 'liquid' | 'inhaler' | 'injection' | 'other'
export type DoseUnit = 'mg' | 'ml' | 'puff' | 'other'
export type ConsentMethod = 'signed form' | 'email' | 'portal'

export interface Medication {
  id: string
  student_id: string
  medication_name: string
  brand_name: string | null
  form: MedicationForm | null
  dose_amount: number | null
  dose_unit: DoseUnit | null
  frequency: string | null
  schedule_times: string[] | null
  prescribing_physician: string | null
  start_date: string | null
  end_date: string | null
  active: boolean
  parent_consent_on_file: boolean
  consent_date: string | null
  consent_method: ConsentMethod | null
  special_instructions: string | null
  created_at: string
}

export type NewMedication = Omit<Medication, 'id' | 'created_at'>

/** Append-only — never edited or deleted after save (Constitution Principle II). */
export interface MedicationAdministration {
  id: string
  medication_id: string
  visit_id: string
  administered_at: string
  administered_by: string
  dose_given: string | null
  notes: string | null
}

export type NewMedicationAdministration = Omit<MedicationAdministration, 'id' | 'administered_at'>
