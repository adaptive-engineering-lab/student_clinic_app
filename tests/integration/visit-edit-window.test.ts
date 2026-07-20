import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

/**
 * Runs against the real local Supabase stack (`supabase start`) — verifies the
 * FR-007 same-day edit window is enforced by update_visit()
 * (supabase/migrations/0020_update_visit_rpc.sql), which is what the app actually
 * calls for visit edits (direct `UPDATE ... WHERE` isn't usable here since `visits`
 * has no SELECT grant — see that migration's header comment for why).
 * Requires supabase/seed.sql's nurse@test.local account.
 */
const SUPABASE_URL = 'http://127.0.0.1:54321'
const ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

let client: SupabaseClient
let studentId: string
let todayVisitId: string
let yesterdayVisitId: string

function psql(sql: string) {
  execSync(
    `docker exec -i supabase_db_student_clinic_app psql -U postgres -d postgres -c ${JSON.stringify(sql)}`,
  )
}

async function getAssessment(visitId: string): Promise<string | null> {
  const { data, error } = await client.rpc('get_visit', { p_visit_id: visitId })
  if (error) throw error
  return data?.[0]?.assessment ?? null
}

beforeAll(async () => {
  client = createClient(SUPABASE_URL, ANON_KEY)
  const { error: signInError } = await client.auth.signInWithPassword({
    email: 'nurse@test.local',
    password: 'test-password-123',
  })
  if (signInError) throw signInError

  studentId = crypto.randomUUID()
  todayVisitId = crypto.randomUUID()
  yesterdayVisitId = crypto.randomUUID()

  psql(
    `insert into public.students (id, first_name, last_name, date_of_birth, student_id_ext) values ('${studentId}', 'Edit', 'Window', '2015-01-01', 'EW-${studentId.slice(0, 8)}')`,
  )

  const nurseId = '00000000-0000-0000-0000-000000000001'
  psql(
    `insert into public.visits (id, student_id, nurse_id, chief_complaint, disposition, visited_at) values ('${todayVisitId}', '${studentId}', '${nurseId}', 'headache', 'returned_to_class', now())`,
  )
  psql(
    `insert into public.visits (id, student_id, nurse_id, chief_complaint, disposition, visited_at) values ('${yesterdayVisitId}', '${studentId}', '${nurseId}', 'headache', 'returned_to_class', now() - interval '1 day')`,
  )
})

afterAll(() => {
  psql(`delete from public.visits where student_id = '${studentId}'`)
  psql(`delete from public.students where id = '${studentId}'`)
})

describe('visit same-day edit window (FR-007)', () => {
  it('allows editing a visit recorded today', async () => {
    const { error } = await client.rpc('update_visit', {
      p_visit_id: todayVisitId,
      p_assessment: 'updated today',
    })
    expect(error).toBeNull()
    expect(await getAssessment(todayVisitId)).toBe('updated today')
  })

  it('rejects editing a visit recorded yesterday', async () => {
    const { error } = await client.rpc('update_visit', {
      p_visit_id: yesterdayVisitId,
      p_assessment: 'should not apply',
    })
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/same calendar day/)
    expect(await getAssessment(yesterdayVisitId)).toBeNull()
  })
})
