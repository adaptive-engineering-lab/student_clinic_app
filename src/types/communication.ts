export type CommunicationMethod = 'call' | 'text' | 'email'
export type CommunicationOutcome = 'reached' | 'no answer' | 'left voicemail' | 'sent message'

export interface CommunicationLogEntry {
  id: string
  student_id: string
  visit_id: string | null
  contact_name: string | null
  relationship: string | null
  method: CommunicationMethod | null
  timestamp: string
  outcome: CommunicationOutcome | null
  notes: string | null
  created_at: string
}

export type NewCommunicationLogEntry = Omit<CommunicationLogEntry, 'created_at'>

/** 1:1 with visits, only valid when visit.disposition = 'sent_home'. */
export interface SendHomeNotice {
  id: string
  visit_id: string
  pdf_url: string | null
  generated_at: string
  emailed_to: string | null
}
