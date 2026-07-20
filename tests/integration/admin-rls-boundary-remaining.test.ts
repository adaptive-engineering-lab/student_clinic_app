import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

/**
 * Runs against the real local Supabase stack. contracts/rls-policies.md requires
 * every "admin: none" row to have an integration test proving it (Constitution
 * Development Workflow gate) — admin-rls-boundary.test.ts only covers students,
 * visits, and medications. This backfills the remaining seven "admin: none" tables
 * (emergency_contacts, medical_alerts, medication_administrations,
 * communication_log, send_home_notices, immunizations, audit_log), found missing
 * during the T090 security review, plus the two overgrants that review fixed
 * (0026_security_review_fixes.sql): emergency_contacts' undocumented DELETE grant
 * and outbreak_alert_config's admin-readable select policy.
 */
const SUPABASE_URL = 'http://127.0.0.1:54321'
const ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const NURSE_ID = '00000000-0000-0000-0000-000000000001'

let nurseClient: SupabaseClient
let adminClient: SupabaseClient
let studentId: string
let visitId: string
let medicationId: string
let contactId: string
let alertId: string
let administrationId: string
let commLogId: string
let noticeId: string
let immunizationId: string

function psql(sql: string) {
  execSync(
    `docker exec -i supabase_db_student_clinic_app psql -U postgres -d postgres -c ${JSON.stringify(sql)}`,
  )
}

beforeAll(async () => {
  nurseClient = createClient(SUPABASE_URL, ANON_KEY)
  const { error: nurseSignInError } = await nurseClient.auth.signInWithPassword({
    email: 'nurse@test.local',
    password: 'test-password-123',
  })
  if (nurseSignInError) throw nurseSignInError

  adminClient = createClient(SUPABASE_URL, ANON_KEY)
  const { error: adminSignInError } = await adminClient.auth.signInWithPassword({
    email: 'admin@test.local',
    password: 'test-password-123',
  })
  if (adminSignInError) throw adminSignInError

  studentId = crypto.randomUUID()
  visitId = crypto.randomUUID()
  medicationId = crypto.randomUUID()
  contactId = crypto.randomUUID()
  alertId = crypto.randomUUID()
  administrationId = crypto.randomUUID()
  commLogId = crypto.randomUUID()
  noticeId = crypto.randomUUID()
  immunizationId = crypto.randomUUID()

  psql(
    `insert into public.students (id, first_name, last_name, date_of_birth, student_id_ext) values ('${studentId}', 'Remaining', 'Boundary', '2015-01-01', 'RB-${studentId.slice(0, 8)}')`,
  )
  psql(
    `insert into public.visits (id, student_id, nurse_id, chief_complaint, disposition) values ('${visitId}', '${studentId}', '${NURSE_ID}', 'headache', 'returned_to_class')`,
  )
  psql(
    `insert into public.medications (id, student_id, medication_name, active, parent_consent_on_file) values ('${medicationId}', '${studentId}', 'Boundary Med', true, true)`,
  )
  psql(
    `insert into public.emergency_contacts (id, student_id, name, relationship, phone_primary) values ('${contactId}', '${studentId}', 'Parent Boundary', 'parent', '555-0100')`,
  )
  psql(
    `insert into public.medical_alerts (id, student_id, type, name, severity) values ('${alertId}', '${studentId}', 'allergy', 'Peanuts', 'severe')`,
  )
  psql(
    `insert into public.medication_administrations (id, medication_id, visit_id, administered_by, dose_given) values ('${administrationId}', '${medicationId}', '${visitId}', '${NURSE_ID}', '5mg')`,
  )
  psql(
    `insert into public.communication_log (id, student_id, visit_id, contact_name, method, outcome) values ('${commLogId}', '${studentId}', '${visitId}', 'Parent Boundary', 'call', 'reached')`,
  )
  psql(`insert into public.send_home_notices (id, visit_id) values ('${noticeId}', '${visitId}')`)
  psql(
    `insert into public.immunizations (id, student_id, vaccine_name) values ('${immunizationId}', '${studentId}', 'MMR')`,
  )
})

afterAll(() => {
  psql(`delete from public.send_home_notices where id = '${noticeId}'`)
  psql(`delete from public.communication_log where id = '${commLogId}'`)
  psql(`delete from public.medication_administrations where id = '${administrationId}'`)
  psql(`delete from public.immunizations where id = '${immunizationId}'`)
  psql(`delete from public.medical_alerts where id = '${alertId}'`)
  psql(`delete from public.emergency_contacts where id = '${contactId}'`)
  psql(`delete from public.medications where id = '${medicationId}'`)
  psql(`delete from public.visits where id = '${visitId}'`)
  psql(`delete from public.students where id = '${studentId}'`)
})

describe('admin role cannot read the remaining clinical tables (contracts/rls-policies.md)', () => {
  it('gets zero rows on emergency_contacts', async () => {
    const { data, error } = await adminClient
      .from('emergency_contacts')
      .select('*')
      .eq('id', contactId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('is denied SELECT on medical_alerts at the grant level (no policy, no table grant)', async () => {
    const { error } = await adminClient.from('medical_alerts').select('*').eq('id', alertId)
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/permission denied/)
  })

  it('gets zero rows on medication_administrations', async () => {
    const { data, error } = await adminClient
      .from('medication_administrations')
      .select('*')
      .eq('id', administrationId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('gets zero rows on communication_log', async () => {
    const { data, error } = await adminClient
      .from('communication_log')
      .select('*')
      .eq('id', commLogId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('gets zero rows on send_home_notices', async () => {
    const { data, error } = await adminClient
      .from('send_home_notices')
      .select('*')
      .eq('id', noticeId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('gets zero rows on immunizations', async () => {
    const { data, error } = await adminClient
      .from('immunizations')
      .select('*')
      .eq('id', immunizationId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('gets zero rows on audit_log', async () => {
    const { data, error } = await adminClient.from('audit_log').select('*').limit(1)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

describe('T090 security review fixes', () => {
  it('rejects a direct DELETE on emergency_contacts even for the owning nurse (no DELETE grant for anyone)', async () => {
    const { error } = await nurseClient.from('emergency_contacts').delete().eq('id', contactId)
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/permission denied/)
  })

  it('denies admin SELECT on outbreak_alert_config (nurse/super_admin only)', async () => {
    const { data, error } = await adminClient.from('outbreak_alert_config').select('*')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})
