/** Row shape from public.outbreak_alerts (FR-021) — no student identifiers by construction. */
export interface OutbreakAlert {
  id: string
  complaint_type: string
  visit_count: number
  window_start: string
  window_end: string
  resolved: boolean
  threshold_used: number
  window_hours: number
  created_at: string
}

/** Singleton row from public.outbreak_alert_config, super_admin-editable (FR-022). */
export interface OutbreakAlertConfig {
  id: string
  threshold: number
  window_hours: number
  updated_by: string | null
  updated_at: string
}
