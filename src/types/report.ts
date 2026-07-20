export type ReportType = 'visit_frequency' | 'immunization_status'
export type ReportAudience = 'nurse' | 'admin'

export interface ReportFilterValues {
  date_from: string | null
  date_to: string | null
  grade: string | null
  homeroom: string | null
  chief_complaint: string | null
  disposition: string | null
}

export const EMPTY_REPORT_FILTERS: ReportFilterValues = {
  date_from: null,
  date_to: null,
  grade: null,
  homeroom: null,
  chief_complaint: null,
  disposition: null,
}

/** Row shape returned by the report_visit_frequency() RPC (0022_report_rpcs.sql). */
export interface VisitFrequencyRow {
  visit_id: string
  student_id: string
  student_name: string
  grade: string | null
  homeroom: string | null
  visited_at: string
  chief_complaint: string
  disposition: string
}

/** Row shape from a direct immunizations+students read (both nurse-readable tables). */
export interface ImmunizationGapRow {
  student_id: string
  student_name: string
  grade: string | null
  vaccine_name: string
  next_due_date: string | null
  overdue: boolean
}

/** admin_visit_summary view row — pre-aggregated, small-N suppressed. */
export interface AdminVisitSummaryRow {
  visit_date: string
  chief_complaint: string
  grade: string | null
  visit_count: number
  distinct_student_count: number
}

/** admin_immunization_gaps view row — pre-aggregated, small-N suppressed. */
export interface AdminImmunizationGapRow {
  grade: string | null
  overdue_or_missing_count: number
  total_students: number
}

export interface Report {
  id: string
  generated_by: string
  report_type: ReportType
  audience: ReportAudience
  filters: ReportFilterValues | null
  pdf_url: string | null
  csv_url: string | null
  generated_at: string
}
