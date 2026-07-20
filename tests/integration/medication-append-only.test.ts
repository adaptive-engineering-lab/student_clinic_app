import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

/**
 * Runs against the real local Supabase stack — verifies medication_administrations
 * is truly append-only at the grant level (Constitution Principle II / FR-014), not
 * just by app convention. Requires supabase/seed.sql's nurse@test.local account.
 */
const SUPABASE_URL = 'http://127.0.0.1:54321'
const ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const NURSE_ID = '00000000-0000-0000-0000-000000000001'

let client: SupabaseClient
let studentId: string
let medicationId: string
let visitId: string
let administrationId: string

function psql(sql: string) {
  execSync(
    `docker exec -i supabase_db_student_clinic_app psql -U postgres -d postgres -c ${JSON.stringify(sql)}`,
  )
}

beforeAll(async () => {
  client = createClient(SUPABASE_URL, ANON_KEY)
  const { error: signInError } = await client.auth.signInWithPassword({
    email: 'nurse@test.local',
    password: 'test-password-123',
  })
  if (signInError) throw signInError

  studentId = crypto.randomUUID()
  medicationId = crypto.randomUUID()
  visitId = crypto.randomUUID()
  administrationId = crypto.randomUUID()

  psql(
    `insert into public.students (id, first_name, last_name, date_of_birth, student_id_ext) values ('${studentId}', 'Append', 'Only', '2015-01-01', 'AO-${studentId.slice(0, 8)}')`,
  )
  psql(
    `insert into public.medications (id, student_id, medication_name, active, parent_consent_on_file) values ('${medicationId}', '${studentId}', 'Test Med', true, true)`,
  )
  psql(
    `insert into public.visits (id, student_id, nurse_id, chief_complaint, disposition) values ('${visitId}', '${studentId}', '${NURSE_ID}', 'headache', 'returned_to_class')`,
  )
  psql(
    `insert into public.medication_administrations (id, medication_id, visit_id, administered_by, dose_given) values ('${administrationId}', '${medicationId}', '${visitId}', '${NURSE_ID}', '5mg')`,
  )
})

afterAll(() => {
  psql(`delete from public.medication_administrations where id = '${administrationId}'`)
  psql(`delete from public.visits where id = '${visitId}'`)
  psql(`delete from public.medications where id = '${medicationId}'`)
  psql(`delete from public.students where id = '${studentId}'`)
})

describe('medication_administrations append-only enforcement (FR-014, Constitution Principle II)', () => {
  it('rejects UPDATE even by the recording nurse', async () => {
    const { error } = await client
      .from('medication_administrations')
      .update({ dose_given: '10mg' })
      .eq('id', administrationId)
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/permission denied/)
  })

  it('rejects DELETE even by the recording nurse', async () => {
    const { error } = await client
      .from('medication_administrations')
      .delete()
      .eq('id', administrationId)
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/permission denied/)
  })

  it('confirms the record is still present and unchanged via SELECT', async () => {
    const { data, error } = await client
      .from('medication_administrations')
      .select('dose_given')
      .eq('id', administrationId)
      .single()
    expect(error).toBeNull()
    expect(data?.dose_given).toBe('5mg')
  })
})
