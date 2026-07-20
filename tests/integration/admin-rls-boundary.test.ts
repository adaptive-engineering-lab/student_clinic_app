import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

/**
 * Runs against the real local Supabase stack — proves the FERPA boundary
 * (Constitution Principle I) holds at the database layer for the `admin` role, not
 * just in application code. Requires supabase/seed.sql's admin@test.local account.
 */
const SUPABASE_URL = 'http://127.0.0.1:54321'
const ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const NURSE_ID = '00000000-0000-0000-0000-000000000001'

let client: SupabaseClient
let studentId: string
let medicationId: string
let visitId: string

function psql(sql: string) {
  execSync(
    `docker exec -i supabase_db_student_clinic_app psql -U postgres -d postgres -c ${JSON.stringify(sql)}`,
  )
}

beforeAll(async () => {
  client = createClient(SUPABASE_URL, ANON_KEY)
  const { error: signInError } = await client.auth.signInWithPassword({
    email: 'admin@test.local',
    password: 'test-password-123',
  })
  if (signInError) throw signInError

  studentId = crypto.randomUUID()
  medicationId = crypto.randomUUID()
  visitId = crypto.randomUUID()

  psql(
    `insert into public.students (id, first_name, last_name, date_of_birth, student_id_ext) values ('${studentId}', 'Admin', 'Boundary', '2015-01-01', 'AB-${studentId.slice(0, 8)}')`,
  )
  psql(
    `insert into public.medications (id, student_id, medication_name, active, parent_consent_on_file) values ('${medicationId}', '${studentId}', 'Boundary Med', true, true)`,
  )
  psql(
    `insert into public.visits (id, student_id, nurse_id, chief_complaint, disposition) values ('${visitId}', '${studentId}', '${NURSE_ID}', 'headache', 'returned_to_class')`,
  )
})

afterAll(() => {
  psql(`delete from public.visits where id = '${visitId}'`)
  psql(`delete from public.medications where id = '${medicationId}'`)
  psql(`delete from public.students where id = '${studentId}'`)
})

describe('admin role cannot read individual student data (Constitution Principle I)', () => {
  it('returns zero rows on direct SELECT of students, even for a row that exists', async () => {
    const { data, error } = await client.from('students').select('*').eq('id', studentId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('is denied SELECT on visits at the grant level (no policy, no table grant at all)', async () => {
    const { error } = await client.from('visits').select('*').eq('id', visitId)
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/permission denied/)
  })

  it('is denied SELECT on medications at the grant level (no policy, no table grant at all)', async () => {
    const { error } = await client.from('medications').select('*').eq('id', medicationId)
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/permission denied/)
  })

  it('is rejected by the report_visit_frequency() RPC (nurse/super_admin only)', async () => {
    const { error } = await client.rpc('report_visit_frequency', {})
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/insufficient_privilege/)
  })

  it('can read the pre-aggregated admin_visit_summary view without error', async () => {
    const { error } = await client.from('admin_visit_summary').select('*')
    expect(error).toBeNull()
  })
})
