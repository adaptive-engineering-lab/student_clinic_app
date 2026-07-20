# Phase 1 Data Model: School Nurse Management System

Source of truth for column-level detail is `school-nurse-app-spec.md` §5; this document
adds the entities/columns implied by the spec's requirements and constitution that
weren't already fully specified (`audit_log`), plus relationships and validation rules.

## students

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| school_id | uuid FK → schools.id | |
| student_id_ext | text UNIQUE | external SIS ID (FR-001) |
| first_name, last_name | text NOT NULL | FR-001 |
| date_of_birth | date NOT NULL | FR-001 |
| gender | text | FR-001 |
| grade, homeroom | text | F-1.3 |
| photo_url | text | Supabase Storage path, FR-002 |
| created_at, updated_at | timestamptz | |

**Validation**: creation blocked unless first_name, last_name, date_of_birth,
student_id_ext all present (FR-001). Profile considered "complete" only once ≥2
emergency contacts exist (FR-003) — enforced at the application layer with a
`profile_complete` derived flag, since the contacts live in a child table.

## emergency_contacts

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK → students.id ON DELETE CASCADE | |
| name, relationship | text NOT NULL | |
| phone_primary | text NOT NULL | |
| phone_secondary, email | text | |
| authorised_to_pickup | boolean DEFAULT false | |

**Validation**: at least 2 rows per student required before profile is "complete" (FR-003).

## medical_alerts

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK → students.id ON DELETE CASCADE | |
| type | text NOT NULL | 'allergy' \| 'condition' |
| subtype | text | food/drug/environmental for allergies |
| name | text NOT NULL | allergen or condition name |
| severity | text NOT NULL | mild \| moderate \| severe \| life-threatening (FR-004) |
| requires_immediate_action | boolean DEFAULT false | drives banner (FR-005) |
| epipen_on_file, inhaler_on_file | boolean DEFAULT false | FR-006 |
| storage_location | text | required display when epipen/inhaler true (FR-006) |
| notes | text | |
| created_at | timestamptz | |

**Derived rule**: a student has an active banner (FR-005) if any row has
`severity IN ('severe','life-threatening')` OR `requires_immediate_action = true`.

## visits

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK → students.id | |
| nurse_id | uuid FK → auth.users.id | |
| visited_at | timestamptz NOT NULL DEFAULT now() | FR-007 |
| chief_complaint | text NOT NULL | picklist value, FR-008 |
| chief_complaint_notes | text | free text, FR-008 |
| temperature_celsius | numeric(4,1) | stored in °C, displayed in both units (FR-009) |
| bp_systolic, bp_diastolic, pulse_bpm, oxygen_saturation | integer | optional (FR-009) |
| assessment | text | max 5000 chars |
| actions_taken | text[] | multi-select enum values |
| disposition | text NOT NULL | required before save (FR-010) |
| parent_contacted | boolean DEFAULT false | FR-011 |
| parent_contact_log | jsonb | denormalized snapshot; full record lives in `communication_log` |
| created_at, updated_at | timestamptz | |

**Validation**: `disposition` required at save (FR-010). Edits permitted only when
`now()::date = visited_at::date` and `nurse_id = current user` (FR-007); enforced via
RLS `UPDATE` policy checking both conditions.

## medications

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK → students.id ON DELETE CASCADE | |
| medication_name, brand_name, form | text | FR-012 |
| dose_amount, dose_unit, frequency | numeric/text | FR-012 |
| schedule_times | time[] | |
| prescribing_physician | text | |
| start_date, end_date | date | |
| active | boolean DEFAULT true | |
| parent_consent_on_file | boolean DEFAULT false | gates administration workflow (FR-013) |
| consent_date, consent_method | date/text | |
| special_instructions | text | |
| created_at | timestamptz | |

**Validation**: medication only selectable in the administration workflow when
`active = true AND parent_consent_on_file = true` (FR-013) — enforced by the query the
administration UI uses, plus an RLS/check-constraint-level guard is not possible here
since consent is a business rule, not a row-visibility rule; guarded in the RPC that
creates `medication_administrations`.

## medication_administrations (append-only)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| medication_id | uuid FK → medications.id | |
| visit_id | uuid FK → visits.id | |
| administered_at | timestamptz NOT NULL DEFAULT now() | |
| administered_by | uuid FK → auth.users.id | |
| dose_given | text | |
| notes | text | |

**Validation**: insert-only RPC rejects the write if the referenced medication's
`parent_consent_on_file` is false (FR-013/FR-014). No `UPDATE`/`DELETE` grant exists for
any role (Constitution Principle II, research.md §3).

## communication_log

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK → students.id | |
| visit_id | uuid FK → visits.id, nullable | null for standalone entries (FR-015) |
| contact_name, relationship | text | |
| method | text | call \| text \| email |
| timestamp | timestamptz | |
| outcome | text | reached \| no answer \| left voicemail \| sent message |
| notes | text | |

**Trigger**: auto-inserted when a `visits` row is saved with `parent_contacted = true`
(FR-011/FR-015).

## send_home_notices

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| visit_id | uuid FK → visits.id | only valid when visit.disposition = 'sent_home' |
| pdf_url | text | Supabase Storage path |
| generated_at | timestamptz | |
| emailed_to | text | emergency contact email, if emailed |

## immunizations

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| student_id | uuid FK → students.id ON DELETE CASCADE | |
| vaccine_name | text NOT NULL | |
| date_administered | date | |
| administered_by | text | |
| lot_number | text | |
| next_due_date | date | drives overdue/missing report (FR-028) |
| created_at | timestamptz | |

## reports

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| generated_by | uuid FK → auth.users.id | |
| report_type | text NOT NULL | |
| audience | text NOT NULL | 'nurse' \| 'admin' — determines which view generated the data (FR-018) |
| filters | jsonb | |
| pdf_url, csv_url | text | csv_url only populated for `audience = 'nurse'` (FR-019) |
| generated_at | timestamptz | |

## outbreak_alerts

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| complaint_type | text NOT NULL | |
| visit_count | integer NOT NULL | |
| window_start, window_end | timestamptz NOT NULL | |
| resolved | boolean DEFAULT false | |
| created_at | timestamptz | |
| threshold_used, window_hours | integer | snapshot of the config at evaluation time |

## outbreak_alert_config

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | singleton row |
| threshold | integer DEFAULT 5 | super_admin-editable (FR-022) |
| window_hours | integer DEFAULT 72 | super_admin-editable (FR-022) |
| updated_by | uuid FK → auth.users.id | |
| updated_at | timestamptz | |

## audit_log (append-only)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| table_name | text NOT NULL | e.g. 'visits', 'medications', 'medical_alerts' |
| row_id | uuid NOT NULL | |
| action | text NOT NULL | 'insert' \| 'update' \| 'read' |
| actor_id | uuid FK → auth.users.id | |
| occurred_at | timestamptz DEFAULT now() | |
| detail | jsonb | changed columns (writes) or accessed fields (reads) |

**Population**: `insert`/`update` rows come from `AFTER INSERT/UPDATE` triggers on
`visits`, `medications`, `medical_alerts`. `read` rows come from the `SECURITY DEFINER`
RPC functions used for all client reads of those same tables (research.md §4). No role
has `UPDATE`/`DELETE` grants on this table.

## Admin-facing aggregate views (read path for `admin` role only)

- `admin_visit_summary` — visits grouped by date bucket / complaint type / grade, with
  any group under 5 distinct students suppressed (research.md §2).
- `admin_immunization_gaps` — counts of overdue/missing immunizations grouped by grade,
  same suppression rule.
- `admin_outbreak_alert_feed` — `outbreak_alerts` columns only (already contains no
  student identifiers by construction).

`admin` has `SELECT` granted only on these three views/functions — no direct grant on
any base clinical table.

## Entity Relationships

```text
students 1──* emergency_contacts
students 1──* medical_alerts
students 1──* visits
students 1──* medications
students 1──* immunizations
students 1──* communication_log (nullable visit_id link)
visits   1──* medication_administrations
visits   1──1 send_home_notices (only when disposition = sent_home)
visits   1──* communication_log (auto-created subset)
medications 1──* medication_administrations
```
