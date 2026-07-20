import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

/**
 * Runs against the real local Supabase stack — proves admin_visit_summary's small-N
 * suppression (research.md §2, Constitution Principle I) actually holds: a group under
 * 5 distinct students must not appear at all, not just be capped/anonymized.
 */
const SUPABASE_URL = 'http://127.0.0.1:54321'
const ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const NURSE_ID = '00000000-0000-0000-0000-000000000001'
const GRADE = `SUPPRESS-${Date.now()}`
const COMPLAINT = 'fever'

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
    `insert into public.students (id, first_name, last_name, date_of_birth, student_id_ext, grade) values ('${studentId}', 'Suppress', 'Test', '2015-01-01', 'SP-${studentId.slice(0, 8)}', '${GRADE}')`,
  )
  psql(
    `insert into public.visits (id, student_id, nurse_id, chief_complaint, disposition) values ('${visitId}', '${studentId}', '${NURSE_ID}', '${COMPLAINT}', 'returned_to_class')`,
  )
}

beforeAll(async () => {
  client = createClient(SUPABASE_URL, ANON_KEY)
  const { error: signInError } = await client.auth.signInWithPassword({
    email: 'admin@test.local',
    password: 'test-password-123',
  })
  if (signInError) throw signInError

  // 4 distinct students — below the suppression threshold.
  for (let i = 0; i < 4; i++) insertStudentWithVisit()
})

afterAll(() => {
  for (const id of visitIds) psql(`delete from public.visits where id = '${id}'`)
  for (const id of studentIds) psql(`delete from public.students where id = '${id}'`)
})

describe('admin_visit_summary small-N suppression (research.md §2)', () => {
  it('suppresses a group with only 4 distinct students', async () => {
    const { data, error } = await client
      .from('admin_visit_summary')
      .select('*')
      .eq('grade', GRADE)
      .eq('chief_complaint', COMPLAINT)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('shows the group once a 5th distinct student pushes it to the threshold', async () => {
    insertStudentWithVisit()

    const { data, error } = await client
      .from('admin_visit_summary')
      .select('*')
      .eq('grade', GRADE)
      .eq('chief_complaint', COMPLAINT)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0].distinct_student_count).toBe(5)
  })
})
