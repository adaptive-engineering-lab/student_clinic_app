import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

/**
 * Runs against the real local Supabase stack. outbreak-alert-notify's email payload
 * (supabase/functions/outbreak-alert-notify/index.ts) is built entirely from
 * outbreak_alerts columns (contracts/edge-functions.md), so the "no student
 * identifiers" guarantee (FR-021) holds structurally rather than by app convention —
 * there's no edge runtime container in this local stack to invoke the function
 * directly, so this proves the guarantee at the layer that actually enforces it:
 * (1) neither outbreak_alerts nor the admin-facing admin_outbreak_alert_feed view
 * expose any identifier-shaped column, and (2) a real trigger-raised alert row's
 * actual data is exactly that aggregate-only shape.
 */
const SUPABASE_URL = 'http://127.0.0.1:54321'
const ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const NURSE_ID = '00000000-0000-0000-0000-000000000001'
const COMPLAINT = `privacy-test-${Date.now()}`
const IDENTIFIER_COLUMN_PATTERN = /student|name|dob|contact|address|phone|email/i

let client: SupabaseClient
const studentIds: string[] = []
const visitIds: string[] = []

function psql(sql: string): string {
  return execSync(
    `docker exec -i supabase_db_student_clinic_app psql -U postgres -d postgres -tA -c ${JSON.stringify(sql)}`,
  ).toString()
}

function columnsOf(table: string): string[] {
  return psql(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = '${table}'`,
  )
    .split('\n')
    .map((c) => c.trim())
    .filter(Boolean)
}

function insertStudentWithVisit() {
  const studentId = crypto.randomUUID()
  const visitId = crypto.randomUUID()
  studentIds.push(studentId)
  visitIds.push(visitId)
  psql(
    `insert into public.students (id, first_name, last_name, date_of_birth, student_id_ext) values ('${studentId}', 'Privacy', 'Test', '2015-01-01', 'PR-${studentId.slice(0, 8)}')`,
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

  for (let i = 0; i < 5; i++) insertStudentWithVisit()
})

afterAll(() => {
  psql(`delete from public.outbreak_alerts where complaint_type = '${COMPLAINT}'`)
  for (const id of visitIds) psql(`delete from public.visits where id = '${id}'`)
  for (const id of studentIds) psql(`delete from public.students where id = '${id}'`)
})

describe('outbreak-alert-notify payload contains no student identifiers (FR-021)', () => {
  it('has no identifier-shaped column on outbreak_alerts itself', () => {
    const columns = columnsOf('outbreak_alerts')
    expect(columns.length).toBeGreaterThan(0)
    for (const column of columns) expect(column).not.toMatch(IDENTIFIER_COLUMN_PATTERN)
  })

  it('has no identifier-shaped column on the admin-facing admin_outbreak_alert_feed view', () => {
    const columns = columnsOf('admin_outbreak_alert_feed')
    expect(columns.length).toBeGreaterThan(0)
    for (const column of columns) expect(column).not.toMatch(IDENTIFIER_COLUMN_PATTERN)
  })

  it('raises a real alert whose row is exactly the aggregate-only payload shape', async () => {
    const { data, error } = await client
      .from('outbreak_alerts')
      .select('*')
      .eq('complaint_type', COMPLAINT)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(Object.keys(data?.[0] ?? {}).sort()).toEqual(
      [
        'id',
        'complaint_type',
        'visit_count',
        'window_start',
        'window_end',
        'resolved',
        'threshold_used',
        'window_hours',
        'created_at',
      ].sort(),
    )
  })
})
