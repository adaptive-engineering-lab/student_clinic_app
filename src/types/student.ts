export interface Student {
  id: string
  school_id: string | null
  student_id_ext: string | null
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string | null
  grade: string | null
  homeroom: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
}

export type NewStudent = Pick<
  Student,
  'first_name' | 'last_name' | 'date_of_birth' | 'gender' | 'grade' | 'homeroom' | 'student_id_ext'
>

export interface EmergencyContact {
  id: string
  student_id: string
  name: string
  relationship: string
  phone_primary: string
  phone_secondary: string | null
  email: string | null
  authorised_to_pickup: boolean
  created_at: string
}

export type NewEmergencyContact = Omit<EmergencyContact, 'id' | 'created_at'>

export type MedicalAlertType = 'allergy' | 'condition'
export type MedicalAlertSeverity = 'mild' | 'moderate' | 'severe' | 'life-threatening'

export interface MedicalAlert {
  id: string
  student_id: string
  type: MedicalAlertType
  subtype: string | null
  name: string
  severity: MedicalAlertSeverity
  requires_immediate_action: boolean
  epipen_on_file: boolean
  inhaler_on_file: boolean
  storage_location: string | null
  notes: string | null
  created_at: string
}

export type NewMedicalAlert = Omit<MedicalAlert, 'id' | 'created_at'>

/** Drives the alert banner (FR-005). */
export function isCriticalAlert(alert: MedicalAlert): boolean {
  return (
    alert.severity === 'severe' ||
    alert.severity === 'life-threatening' ||
    alert.requires_immediate_action
  )
}
