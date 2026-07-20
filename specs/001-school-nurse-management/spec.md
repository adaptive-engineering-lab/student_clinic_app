# Feature Specification: School Nurse Management System

**Feature Branch**: `001-school-nurse-management`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Build the School Nurse Management System as described in school-nurse-app-spec.md: a PWA for school nurses to manage student health records, log clinic visits, track medications and administration, log parent/guardian communications, and generate reports for nurses (full clinical detail) and admins (aggregate/de-identified only), with offline support for intermittent school wifi."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintain student health profiles (Priority: P1)

A nurse creates and maintains a health profile for every student: identity, photo, grade/homeroom, emergency contacts, allergies, chronic conditions, and immunization history. This profile is the single source of truth referenced by every other workflow.

**Why this priority**: Nothing else in the system works without a student profile to attach visits, medications, and alerts to. It also delivers standalone value on day one: a searchable roster with emergency contacts and health context.

**Independent Test**: Can be fully tested by creating a student profile with demographics, a photo, two emergency contacts, and an allergy, then confirming the profile displays correctly and is searchable — without any visit ever being logged.

**Acceptance Scenarios**:

1. **Given** a new student, **When** the nurse enters first/last name, date of birth, gender, and school-issued student ID, **Then** the profile is created and appears in the student roster.
2. **Given** a student profile, **When** the nurse uploads a headshot photo, **Then** the photo displays on the profile and on every visit screen for that student.
3. **Given** a student profile, **When** the nurse adds fewer than 2 emergency contacts and attempts to save, **Then** the system prevents saving until at least 2 contacts are recorded.
4. **Given** a student with a severe or life-threatening allergy or a condition flagged as requiring immediate action, **When** anyone opens that student's profile, **Then** a full-width alert banner appears at the top summarizing the condition/allergy and any on-file epipen/inhaler location.

---

### User Story 2 - Record a clinic visit safely, alerts-first (Priority: P1)

A nurse brings up a student during a clinic visit, immediately sees any critical medical alerts before doing anything else, records the reason for the visit, optional vitals, assessment notes, actions taken, and a required disposition (returned to class, sent home, emergency transport, or still in clinic).

**Why this priority**: This is the nurse's primary daily workflow and the core safety mechanism of the whole system — alerts must surface before treatment decisions are made.

**Independent Test**: Can be fully tested by opening a new visit for a student with a known severe allergy, confirming the alert banner renders before any other visit content, completing the visit form, and confirming it cannot be saved without a disposition.

**Acceptance Scenarios**:

1. **Given** a student with a life-threatening allergy, **When** a nurse starts a new visit for that student, **Then** the alert banner renders at the top of the visit form before the nurse can enter any other data.
2. **Given** an open visit form, **When** the nurse selects a chief complaint from the picklist and adds free-text detail, **Then** both are saved with the visit.
3. **Given** an open visit form, **When** the nurse attempts to save without selecting a disposition, **Then** the system blocks the save and prompts for a disposition.
4. **Given** a saved visit from earlier today, **When** the nurse edits it before midnight, **Then** the edit is accepted; **When** the nurse attempts to edit it after the calendar day has ended, **Then** the edit is rejected.
5. **Given** a visit where vitals are entered in Celsius, **When** the visit is displayed, **Then** temperature is also shown in Fahrenheit.

---

### User Story 3 - Administer medications with consent safeguards (Priority: P2)

A nurse looks up a student's on-file medications during a visit, administers a dose, and the system creates a permanent, append-only administration record. Medications without parent consent on file cannot be administered through this workflow.

**Why this priority**: Medication errors are a top patient-safety risk in a school clinic; consent enforcement and an immutable log are required before this module can be trusted for daily use.

**Independent Test**: Can be fully tested by adding a medication with consent marked "not on file," confirming it does not appear in the administration workflow, then marking consent on file and confirming it now appears and can be logged.

**Acceptance Scenarios**:

1. **Given** a medication on file with `parent_consent_on_file = false`, **When** the nurse opens the administration workflow for that student, **Then** that medication does not appear as an option.
2. **Given** a medication with consent on file, **When** the nurse logs an administration during a visit, **Then** a record is created with the dose given, timestamp, administering nurse, and linked visit.
3. **Given** a saved medication administration record, **When** anyone (including the recording nurse) attempts to edit or delete it, **Then** the system refuses — the record is permanent.

---

### User Story 4 - Maintain a parent/guardian communication trail (Priority: P2)

Whenever a nurse contacts a parent/guardian — automatically prompted after marking a visit as "parent contacted" or "sent home," or started standalone from a student's profile — the system records who was contacted, how, when, and the outcome. Sent-home visits can generate a printable or emailable notice.

**Why this priority**: A documented contact trail is a legal and operational safeguard that must exist alongside every sent-home or parent-notified visit.

**Independent Test**: Can be fully tested by marking a visit's disposition as "sent home," generating the send-home notice, and confirming a communication log entry and a stored notice are both created and linked to that visit — independent of reporting or medication features.

**Acceptance Scenarios**:

1. **Given** a visit marked `parent_contacted = true`, **When** the nurse saves the visit, **Then** a communication log entry is created capturing contact name, method, time, and outcome.
2. **Given** a visit with disposition "sent home," **When** the nurse generates a send-home notice, **Then** a one-page notice with student name, date/time, reason, and nurse name is available to print or email to an emergency contact on file.
3. **Given** a sent notice, **When** the nurse revisits the student's visit history, **Then** the notice is retrievable and linked to the originating visit.

---

### User Story 5 - Generate reports with the admin aggregate boundary enforced (Priority: P3)

A nurse generates visit-frequency, immunization-compliance, and other reports with full clinical detail. When the same report (or its outbreak-alert summary) is intended for a school administrator, the system strips all individual student identifiers and shows only aggregated counts and trends.

**Why this priority**: Reporting is high-value but depends on the data captured by earlier stories; the admin/nurse boundary is a compliance-critical requirement that must be verified before this module ships.

**Independent Test**: Can be fully tested by generating the same report as a nurse and as an admin and confirming the nurse version includes student names while the admin version contains none — using only seeded visit data, independent of medication or communication features.

**Acceptance Scenarios**:

1. **Given** a date range and filter set, **When** a nurse generates a visit-frequency report, **Then** it shows total visits, a breakdown by complaint type, a daily trend, and (nurse-only) the top 10 most frequent visitors by name.
2. **Given** the same filters, **When** an admin generates the equivalent report, **Then** it shows only aggregate counts and trends with no student names, IDs, or free-text notes.
3. **Given** a generated report, **When** the user exports it, **Then** a PDF is available to all roles and a CSV (raw data) is available to nurses only.
4. **Given** a generated report, **When** the user chooses to email it, **Then** the nurse recipient receives the full clinical PDF and the admin recipient receives only the aggregate-only PDF.

---

### User Story 6 - Receive automatic outbreak/trend alerts (Priority: P3)

The system watches every newly saved visit for a spike in a single chief complaint and alerts the nurse in-app, plus emails a no-names summary to admins, when a configurable threshold is crossed.

**Why this priority**: Valuable for early outbreak detection but depends on visit data already being captured reliably (Story 2), so it is lower priority than the core clinical workflows.

**Independent Test**: Can be fully tested by saving 5 visits with the same chief complaint for 5 different students within a 72-hour window and confirming an in-app alert appears for the nurse and a no-names summary email is queued for admins.

**Acceptance Scenarios**:

1. **Given** fewer than 5 visits with the same chief complaint in the rolling 72-hour window, **When** a new matching visit is saved, **Then** no alert is generated.
2. **Given** exactly 5 visits with the same chief complaint from 5 distinct students within a rolling 72-hour window, **When** the 5th visit is saved, **Then** an in-app alert banner appears for the nurse and an aggregate summary (complaint type, count, date range — no student names) is emailed to admins.
3. **Given** the alert threshold is a configurable value, **When** a super_admin changes it, **Then** subsequent alert evaluations use the new threshold.

---

### Edge Cases

- What happens when a nurse tries to log a medication administration for a student whose consent was revoked after the medication was added but before this visit?
- How does the system behave if two devices queue offline edits to the same visit and both sync after reconnecting — which write wins?
- What happens when a photo upload fails or is interrupted while offline?
- How does the system handle a student profile with a duplicate external school-ID (SIS ID conflict)?
- What happens when an admin's report request is filtered in a way that would return a group smaller than a safe aggregate size (e.g., 1 student matching filters) — does the system suppress or generalize the result to avoid re-identification?
- How does the system behave when a nurse's session expires (30 minutes idle) mid-visit-entry — is unsaved data preserved locally?
- What happens when the outbreak-alert threshold is changed while a rolling 72-hour window is already in progress?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require first name, last name, date of birth, gender, and external school-system student ID to create a student profile.
- **FR-002**: System MUST allow a photo to be attached to a student profile and display it on the profile and on any visit screen for that student.
- **FR-003**: System MUST require at least 2 emergency contacts per student before the profile can be marked complete, each with name, relationship, primary phone, and pickup-authorization flag.
- **FR-004**: System MUST record allergies (food/drug/environmental/other) and chronic conditions per student, each with a severity level (mild/moderate/severe/life-threatening).
- **FR-005**: System MUST display a full-width alert banner on a student's profile and on any new visit for that student whenever the student has a severe/life-threatening allergy or a condition flagged as requiring immediate action.
- **FR-006**: System MUST show on-file epipen/inhaler status and storage location within the alert banner when applicable.
- **FR-007**: System MUST timestamp every visit automatically at creation and allow edits only by the recording nurse within the same calendar day.
- **FR-008**: System MUST capture chief complaint via a fixed picklist plus an always-available free-text field.
- **FR-009**: System MUST accept optional vitals (temperature, blood pressure, pulse, oxygen saturation) and display temperature in both Celsius and Fahrenheit regardless of entry unit.
- **FR-010**: System MUST require a disposition (returned to class / sent home / emergency transport / still in clinic) before a visit can be saved.
- **FR-011**: System MUST capture parent-contact details (name, method, time, notes) whenever a visit is flagged as having contacted a parent/guardian.
- **FR-012**: System MUST track each student's on-file medications, including dosage, schedule, prescribing physician, and an active/inactive flag.
- **FR-013**: System MUST exclude any medication from the administration workflow when parent consent is not on file.
- **FR-014**: System MUST create a permanent record of every medication administration (who, what, when, dose, linked visit) that cannot be edited or deleted after creation.
- **FR-015**: System MUST create a parent/guardian communication log entry automatically whenever a visit records parent contact, and MUST also allow standalone communication entries from a student's profile.
- **FR-016**: System MUST generate a printable/emailable send-home notice (student name, date/time, reason, nurse name, school contact info) for any visit with disposition "sent home," and MUST retain the notice linked to that visit.
- **FR-017**: System MUST allow nurses to generate visit-frequency and immunization-status reports filtered by date range, grade, homeroom, complaint type, and disposition.
- **FR-018**: System MUST produce two variants of any admin-facing report or alert: a full-detail version for nurses (including student identities) and an aggregate-only version for admins that contains no student names, IDs, or free-text notes.
- **FR-019**: System MUST support exporting reports as PDF (all roles) and CSV (nurse role only), and MUST retain generated reports for later retrieval.
- **FR-020**: System MUST support emailing a generated report to the requesting user, sending the role-appropriate variant (full detail to nurse, aggregate-only to admin).
- **FR-021**: System MUST evaluate every newly saved visit against outbreak-detection rules and raise an in-app alert to nurses, plus an aggregate no-names summary emailed to admins, when 5 or more students report the same chief complaint within a rolling 72-hour window.
- **FR-022**: System MUST allow a super_admin to configure the outbreak-alert threshold and rolling-window duration.
- **FR-023**: System MUST allow nurses and super_admins full read/write access to individual student health data, and MUST prevent the admin role from reading or exporting any individual student health record under any circumstance.
- **FR-024**: System MUST continue to accept visit creation, medication administration, and parent-contact logging while the device has no connectivity, queue those writes locally, and synchronize them in chronological order once connectivity returns.
- **FR-025**: System MUST notify the nurse if a queued offline write fails to synchronize.
- **FR-026**: System MUST log every read and write to student health alerts, visits, and medications to an append-only audit trail.
- **FR-027**: System MUST end a user's session automatically after 30 minutes of inactivity.
- **FR-028**: System MUST track immunization records per student (vaccine, date administered, administering party, lot number, next-due date) and surface students with overdue or missing immunizations, filterable by grade.

### Key Entities *(include if feature involves data)*

- **Student**: A single enrolled student's identity and school context — name, date of birth, gender, external student ID, grade, homeroom, photo. Central reference point for all other entities.
- **Emergency Contact**: A person authorized to be contacted (and optionally to pick up) a student — name, relationship, phone(s), email, pickup authorization.
- **Medical Alert**: An allergy or chronic condition tied to a student, with type, severity, and whether it requires immediate action; drives alert-banner display.
- **Visit**: A single clinic encounter — timestamp, chief complaint, optional vitals, assessment notes, actions taken, disposition, and parent-contact flag/details.
- **Medication**: A medication a student is authorized to receive at school — name, form, dosage/schedule, prescriber, active status, and parent-consent status.
- **Medication Administration**: An immutable record of a single dose given to a student, linked to the medication and the originating visit.
- **Communication Log Entry**: A record of a single parent/guardian contact — who, method, timestamp, outcome, notes; may be linked to a visit or standalone.
- **Send-Home Notice**: A generated document tied to a "sent home" visit, retained for later retrieval.
- **Immunization Record**: A single vaccination event for a student — vaccine, date, administering party, lot number, next-due date.
- **Report**: A generated, filtered view of visit/immunization data, with distinct nurse (full-detail) and admin (aggregate-only) variants, exportable and emailable.
- **Outbreak Alert**: A system-generated flag when a chief complaint crosses a configurable frequency threshold within a rolling window.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A nurse can see any critical (severe/life-threatening) allergy or condition alert for a student within 3 seconds of opening that student's profile or starting a new visit for them.
- **SC-002**: 100% of visits flagged as "parent contacted" or "sent home" produce a matching communication log entry — verified across a sample of test visits.
- **SC-003**: 0% of admin-facing reports, alert emails, or exports contain any individual student name, ID, or free-text clinical note, across all report types.
- **SC-004**: 0% of medication administration attempts succeed for medications without parent consent on file.
- **SC-005**: A nurse can complete a routine visit (open student → enter complaint → set disposition → save) in under 2 minutes.
- **SC-006**: All visit, medication, and parent-contact actions performed while offline are successfully synchronized within 60 seconds of connectivity being restored, with zero silent data loss.
- **SC-007**: An outbreak alert is raised within one visit-save of the configured threshold being crossed, 100% of the time in testing.
- **SC-008**: A nurse can locate a specific student's profile from the roster in under 10 seconds.

## Assumptions

- Nurse and super_admin accounts are provisioned by a super_admin (district coordinator) or IT staff, not self-service — consistent with the role table's description of super_admin as having "user management" authority.
- Outbreak-alert summaries are emailed to admins automatically when raised (no manual nurse trigger required), since the underlying rule is defined as running "on every new visit save."
- No automated deletion/purge of visit or health records is implemented in this version; retention period is a pending district/legal decision (see Technology & Compliance Constraints in the project constitution). Records are retained indefinitely until that decision is made.
- Send-home notices do not require captured parent signatures in this version; the notice is a notification document, not a consent form.
- Data residency (hosting region) is assumed acceptable at a standard North American region by default, pending explicit district confirmation.
- "Reasonable aggregate size" for admin-facing reports defaults to suppressing or generalizing any breakdown that would reveal a group of fewer than 5 students, to avoid indirect re-identification.
- Users have access to a modern browser on desktop, tablet, or mobile; no native mobile app is in scope.
