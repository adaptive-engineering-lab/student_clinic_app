import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

/**
 * Runs against the real local Supabase stack — verifies visits_outbreak_check
 * (supabase/migrations/0025_outbreak_trigger.sql) fires exactly at the configured
 * threshold (FR-021, research.md §7): a 5th distinct student with a matching
 * complaint in the rolling window creates an outbreak_alerts row, a 4th does not.
 * Requires supabase/seed.sql's nurse@test.local account and the default
 * outbreak_alert_config singleton (threshold 5, window_hours 72).
 */
const SUPABASE_URL = 'http://127.0.0.1:54321'
const ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const NURSE_ID = '00000000-0000-0000-0000-000000000001'
const COMPLAINT = `outbreak-test-${Date.now()}`

let client: SupabaseClient
const studentIds: string[] = []
const visitIds: string[] = []

function psql(sql: string) {
  execSync(
    `docker exec -i supabase_db_student_clinic_app psql -U postgres -d postgres -c ${JSON.stringify(sql)}`,
  )
}

function insertStudentWithVisit() {
  const studentId = crypto.randomUUID()
  const visitId = crypto.randomUUID()
  studentIds.push(studentId)
  visitIds.push(visitId)
  psql(
    `insert into public.students (id, first_name, last_name, date_of_birth, student_id_ext) values ('${studentId}', 'Outbreak', 'Test', '2015-01-01', 'OB-${studentId.slice(0, 8)}')`,
  )
  psql(
    `insert into public.visits (id, student_id, nurse_id, chief_complaint, disposition) values ('${visitId}', '${studentId}', '${NURSE_ID}', '${COMPLAINT}', 'returned_to_class')`,
  )
}

beforeAll(async () => {
  client = createClient(SUPABASE_URL, ANON_KEY)
  const { error: signInError } = await client.auth.signInWithPassword({
    email: 'nurse@test.local',
    password: 'test-password-123',
  })
  if (signInError) throw signInError
})

afterAll(() => {
  psql(`delete from public.outbreak_alerts where complaint_type = '${COMPLAINT}'`)
  for (const id of visitIds) psql(`delete from public.visits where id = '${id}'`)
  for (const id of studentIds) psql(`delete from public.students where id = '${id}'`)
})

describe('outbreak-alert threshold (FR-021, research.md §7)', () => {
  it('does not raise an alert for a 4th distinct student', async () => {
    for (let i = 0; i < 4; i++) insertStudentWithVisit()

    const { data, error } = await client
      .from('outbreak_alerts')
      .select('*')
      .eq('complaint_type', COMPLAINT)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('raises an alert once a 5th distinct student matches within the window', async () => {
    insertStudentWithVisit()

    const { data, error } = await client
      .from('outbreak_alerts')
      .select('*')
      .eq('complaint_type', COMPLAINT)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0].visit_count).toBe(5)
    expect(data?.[0].threshold_used).toBe(5)
    expect(data?.[0].window_hours).toBe(72)
    expect(data?.[0].resolved).toBe(false)
  })
})
