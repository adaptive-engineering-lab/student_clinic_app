# Product Spec — School Nurse Management System
**Version:** 0.1 — Draft  
**Author:** TBD  
**Last updated:** 2026-06-07  
**Status:** Ready for implementation

---

## 1. Overview

A progressive web app (PWA) that gives school nurses a fast, reliable system to manage student health records, log clinic visits, track medications, and generate on-demand reports for nurses and school administrators.

The app must work on any device (desktop, tablet, mobile) and remain functional when school wifi is intermittent. All data is protected under FERPA. Administrators see only aggregate data — never individual student health records.

---

## 2. Users & roles

| Role | Description | Access |
|---|---|---|
| `nurse` | Primary user. Logs visits, manages records, runs reports. | Full read/write on all student health data |
| `admin` | School principal or office administrator. | Aggregate reports only — no individual student records |
| `super_admin` | App owner / district coordinator. | All schools, user management |

> **FERPA boundary:** The `admin` role must never receive or view individual student health data. All queries for admin-facing reports must return aggregated, de-identified data only. This is enforced at the database level via Supabase Row Level Security (RLS) policies.

---

## 3. Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite | Component-based, fast builds, PWA plugin |
| PWA | `vite-plugin-pwa` | Service worker, offline caching, installable |
| Styling | Tailwind CSS | Fast to build, easy to maintain solo |
| Backend | Supabase | Postgres + auth + storage + edge functions |
| Auth | Supabase Auth | Built-in RLS, role-based access |
| Offline | Dexie.js (IndexedDB) | Queue visits offline, sync on reconnect |
| Email | Resend | Transactional email + PDF attachment delivery |
| PDF generation | `@react-pdf/renderer` | Generate reports as PDFs in Edge Functions |
| Deployment | Vercel | Zero-config, auto-HTTPS, free tier |
| CI/CD | GitHub Actions | Auto-deploy on push to `main` |

---

## 4. Core modules

---

### Module 1 — Student profiles

**Purpose:** A single source of truth for each student's identity and health context. Shown on every visit.

#### Features

**F-1.1 Basic demographics**  
Fields: `first_name`, `last_name`, `date_of_birth`, `gender`, `student_id` (from school SIS).  
All fields required at creation.

**F-1.2 Photo ID**  
Upload a headshot photo per student. Stored in Supabase Storage under `/students/{student_id}/photo`. Displayed prominently on the profile and visit screens so the nurse can quickly confirm identity.

**F-1.3 Class / grade / homeroom**  
Fields: `grade` (K–12), `homeroom_teacher`, `class_schedule` (optional JSON). Used for filtering in visit reports.

**F-1.4 Emergency contacts**  
Minimum 2 contacts per student. Fields per contact: `name`, `relationship`, `phone_primary`, `phone_secondary`, `email`, `authorised_to_pickup` (boolean).  
Displayed with tap-to-call on mobile.

---

### Module 2 — Medical alerts & conditions

**Purpose:** Surface critical health information instantly — before the nurse does anything else — to prevent harm.

#### Features

**F-2.1 Allergies**  
Types: `food`, `drug`, `environmental`, `other`.  
Fields per allergy: `allergen`, `type`, `reaction_description`, `severity` (see F-2.5).

**F-2.2 Chronic conditions**  
Free-text + structured field. Examples: asthma, type 1 diabetes, epilepsy.  
Fields: `condition_name`, `diagnosed_date`, `managing_physician`, `notes`.

**F-2.3 Alert banner**  
If a student has any allergy with severity `severe` or `life-threatening`, or any chronic condition flagged as `requires_immediate_action`, a full-width red alert banner renders at the top of their profile and at the top of any new visit form for that student.  
Banner is dismissible per-session only — it reappears on next load.

**F-2.4 Epipen / inhaler on file**  
Boolean flags: `epipen_on_file`, `inhaler_on_file`.  
If true, show location field: `storage_location` (e.g. "Locked cabinet A, shelf 2").  
Displayed inside the alert banner when relevant.

**F-2.5 Severity levels**  
Enum used across allergies and conditions: `mild` | `moderate` | `severe` | `life-threatening`.  
Drives alert banner display logic and report filtering.

---

### Module 3 — Visit log

**Purpose:** The nurse's primary daily workflow. Every clinic visit is recorded here.

#### Features

**F-3.1 Date / time stamp**  
Auto-populated on visit creation using `now()`. Editable by nurse within the same calendar day only. Stored in UTC, displayed in school's local timezone.

**F-3.2 Chief complaint / reason**  
Structured picklist + free text.  
Picklist options: `headache`, `stomach pain`, `injury`, `fever`, `allergic reaction`, `anxiety/emotional`, `medication administration`, `vision/hearing check`, `other`.  
Free-text field always available alongside picklist.

**F-3.3 Vitals**  
Optional fields (not all visits require vitals):  
- `temperature_celsius` (numeric, 1 decimal)  
- `blood_pressure_systolic` / `blood_pressure_diastolic` (integer mmHg)  
- `pulse_bpm` (integer)  
- `oxygen_saturation_pct` (integer, optional)  

Display in both °C and °F. Store in °C.

**F-3.4 Assessment & notes**  
Long-form free text. Supports basic markdown (bold, bullet lists). Max 5,000 characters.

**F-3.5 Action taken**  
Structured multi-select + free text.  
Options: `rest provided`, `ice applied`, `medication administered`, `wound cleaned/dressed`, `emergency services called`, `parent/guardian contacted`, `referred to doctor`, `other`.

**F-3.6 Disposition — sent home / returned to class**  
Required field on every visit before it can be saved.  
Enum: `returned_to_class` | `sent_home` | `emergency_transport` | `still_in_clinic`.

**F-3.7 Parent contacted**  
Boolean: `parent_contacted`.  
If `true`, show: `contact_name`, `contact_method` (call / text / email), `contact_time`, `notes`.

---

### Module 4 — Medication management

**Purpose:** Track all medications a student is authorised to receive at school, log every administration, and maintain consent records.

#### Features

**F-4.1 Medications on file**  
Fields: `medication_name`, `brand_name`, `form` (tablet / liquid / inhaler / injection / other), `prescribing_physician`, `start_date`, `end_date` (optional), `active` (boolean).

**F-4.2 Dosage & schedule**  
Fields: `dose_amount`, `dose_unit` (mg / ml / puff / other), `frequency`, `schedule_times` (array of times e.g. `["08:00", "12:00"]`), `special_instructions` (free text).

**F-4.3 Administration log**  
Every time a medication is given, a log entry is created automatically from the visit. Fields: `administered_at`, `dose_given`, `administered_by` (nurse user ID), `visit_id` (FK), `notes`.  
The log is append-only — no edits or deletes after save.

**F-4.4 Parent consent on file**  
Boolean: `parent_consent_on_file`. If `false`, medication must not appear in the administration workflow.  
Field: `consent_date`, `consent_method` (signed form / email / portal).

---

### Module 5 — Communication log

**Purpose:** Record every parent/guardian contact so there is a clear paper trail.

#### Features

**F-5.1 Parent notification log**  
Auto-created when F-3.7 `parent_contacted = true`. Also creatable standalone from the student profile.  
Fields: `contact_name`, `relationship`, `method`, `timestamp`, `outcome` (reached / no answer / left voicemail / sent message), `notes`.

**F-5.2 Send home notice**  
Generate a printable / emailable one-page notice when a student is sent home.  
Template includes: student name, date/time, reason for dismissal, nurse name, school contact info.  
Delivery options: print (browser print dialog) or email to emergency contact on file.  
Sent notices are stored in Supabase Storage and linked to the visit record.

---

### Module 6 — Reporting

**Purpose:** On-demand health reports for the nurse (clinical detail) and principal/admin (aggregate only).

#### Features

**F-6.1 Visit frequency report**  
Filters: date range, grade, homeroom, chief complaint type, disposition.  
Output: total visits, breakdown by complaint type (bar chart), top 10 most frequent visitors (nurse view only), daily trend line.

**F-6.2 Immunization records**  
Per-student immunization history.  
Fields per record: `vaccine_name`, `date_administered`, `administered_by`, `lot_number`, `next_due_date`.  
Report view: students with overdue or missing immunizations, filterable by grade.

**F-6.3 Export**  
All reports exportable as:  
- PDF (formatted, school-branded header) via `@react-pdf/renderer` in a Supabase Edge Function  
- CSV (raw data, nurse view only)  

PDFs saved to Supabase Storage and accessible from a "Report history" tab in-app.

**F-6.4 Email delivery**  
When a report is generated, the user can opt to email it.  
- Nurse receives: full clinical PDF  
- Admin receives: aggregate-only PDF (no individual student data)  
Email sent via Resend with the PDF as an attachment.

**F-6.5 Outbreak / trend alerts**  
Rule-based flagging that runs on every new visit save:  
- If `≥ 5 students` report the same chief complaint within a `72-hour` rolling window → generate an alert.  
Alert shown as an in-app banner to the nurse.  
Alert summary (complaint type, count, date range — no student names) emailed to admin.  
Thresholds configurable by `super_admin`.

---

## 5. Data models

### `students`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
school_id       uuid REFERENCES schools(id)
student_id_ext  text UNIQUE          -- external SIS ID
first_name      text NOT NULL
last_name       text NOT NULL
date_of_birth   date NOT NULL
gender          text
grade           text
homeroom        text
photo_url       text
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### `medical_alerts`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
student_id      uuid REFERENCES students(id) ON DELETE CASCADE
type            text NOT NULL    -- 'allergy' | 'condition'
subtype         text             -- 'food' | 'drug' | 'environmental' for allergies
name            text NOT NULL
severity        text NOT NULL    -- 'mild' | 'moderate' | 'severe' | 'life-threatening'
notes           text
requires_immediate_action boolean DEFAULT false
created_at      timestamptz DEFAULT now()
```

### `visits`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
student_id          uuid REFERENCES students(id)
nurse_id            uuid REFERENCES auth.users(id)
visited_at          timestamptz NOT NULL DEFAULT now()
chief_complaint     text NOT NULL
chief_complaint_notes text
temperature_celsius numeric(4,1)
bp_systolic         integer
bp_diastolic        integer
pulse_bpm           integer
oxygen_saturation   integer
assessment          text
actions_taken       text[]       -- array of action enum values
disposition         text NOT NULL -- enum
parent_contacted    boolean DEFAULT false
parent_contact_log  jsonb
created_at          timestamptz DEFAULT now()
```

### `medications`
```sql
id                    uuid PRIMARY KEY DEFAULT gen_random_uuid()
student_id            uuid REFERENCES students(id) ON DELETE CASCADE
medication_name       text NOT NULL
brand_name            text
form                  text
dose_amount           numeric
dose_unit             text
frequency             text
schedule_times        time[]
prescribing_physician text
start_date            date
end_date              date
active                boolean DEFAULT true
parent_consent_on_file boolean DEFAULT false
consent_date          date
special_instructions  text
created_at            timestamptz DEFAULT now()
```

### `medication_administrations`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
medication_id   uuid REFERENCES medications(id)
visit_id        uuid REFERENCES visits(id)
administered_at timestamptz NOT NULL DEFAULT now()
administered_by uuid REFERENCES auth.users(id)
dose_given      text
notes           text
-- NO updated_at: append-only, no edits
```

### `immunizations`
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
student_id        uuid REFERENCES students(id) ON DELETE CASCADE
vaccine_name      text NOT NULL
date_administered date
administered_by   text
lot_number        text
next_due_date     date
created_at        timestamptz DEFAULT now()
```

### `reports`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
generated_by  uuid REFERENCES auth.users(id)
report_type   text NOT NULL
filters       jsonb
pdf_url       text
csv_url       text
generated_at  timestamptz DEFAULT now()
```

### `outbreak_alerts`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
complaint_type  text NOT NULL
visit_count     integer NOT NULL
window_start    timestamptz NOT NULL
window_end      timestamptz NOT NULL
resolved        boolean DEFAULT false
created_at      timestamptz DEFAULT now()
```

---

## 6. Offline behaviour

The app uses Dexie.js (IndexedDB) to queue writes when the device is offline.

- Visit saves, medication administrations, and parent contact logs are queued locally if Supabase is unreachable.
- On reconnect, the service worker triggers a sync flush — all queued writes are sent to Supabase in chronological order.
- Read data (student profiles, medications) is cached via the PWA service worker for offline access.
- Conflict resolution: last-write-wins on sync. Nurse is notified if a sync error occurs.

---

## 7. Compliance notes

- **FERPA:** Student health records are education records. Access is restricted to authenticated school staff with an `nurse` or `super_admin` role. Admin role never receives individual student data.
- **Data residency:** Confirm Supabase region (default `us-east-1`) satisfies district requirements before launch.
- **Audit log:** All reads and writes to `visits`, `medications`, and `medical_alerts` are logged to a `audit_log` table via Postgres triggers. Log is append-only.
- **Encryption:** All data encrypted at rest (Supabase default). TLS enforced for all traffic.
- **Session:** Auto-logout after 30 minutes of inactivity.

---

## 8. Out of scope (v1)

- SIS integration (PowerSchool, Infinite Campus)
- Parent portal / parent login
- Scheduled/automated report delivery
- Telemedicine or EHR integration
- Multi-school district dashboard
- Native iOS / Android apps

---

## 9. Open questions

- [ ] Does the school district require data to be hosted in a specific region or on-premise?
- [ ] Who provisions nurse accounts — IT admin or the nurse themselves?
- [ ] Should the principal receive outbreak alert emails automatically, or only when the nurse triggers a report?
- [ ] What's the retention policy for visit records? (FERPA allows destruction after eligibility ends — typically age 21 or 3 years post-graduation.)
- [ ] Does the send-home notice need a parent signature capture?
