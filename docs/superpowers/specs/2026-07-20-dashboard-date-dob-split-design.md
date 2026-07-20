# Design: Dashboard Date Display & Split Date-of-Birth Fields

**Date**: 2026-07-20
**Status**: Approved

## Problem

Two small UI gaps in the student clinic app:

1. The Dashboard home page shows no indication of the current day/date.
2. The student create/edit form uses a single native `<input type="date">` for date of
   birth. The requester wants it split into three separate Day / Month / Year fields.

## 1. Dashboard date display

**File**: `src/routes/DashboardPage.tsx`

Add a single line under the page heading showing today's full date, e.g. "Monday, July
20, 2026". Computed once via `new Date()` and formatted with:

```ts
new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})
```

Static — no ticking clock, no interval, no new state. `DashboardPage` is not
memoized/reused across renders in a way that would make a stale date noticeable within
a session.

## 2. Split date-of-birth fields

**File**: `src/features/students/StudentProfileForm.tsx`

Replace the single `<input type="date">` bound to `dateOfBirth: string` with three
`<select>` elements, in this order: **Day, Month, Year**.

- **Day**: options 1–31.
- **Month**: options January–December (select value is the 1–12 month number; label is
  the month name).
- **Year**: options from `currentYear - 3` down to `currentYear - 21` (covers typical
  K-12 student ages; descending order so recent years are near the top).

### State

Replace the single `dateOfBirth` state string with three pieces of state:
`dobDay: number | ''`, `dobMonth: number | ''`, `dobYear: number | ''`, each
initialized from parsing `student.date_of_birth` (an existing `'YYYY-MM-DD'` string)
when editing, or `''` when creating.

### Assembly & validation

On submit:

1. Require all three to be selected (mirrors the existing `required` behavior on the
   single date input).
2. Construct a `Date` from the three parts and confirm it round-trips to the same
   day/month/year (e.g. `new Date(year, month - 1, day)` then check
   `.getDate() === day && .getMonth() === month - 1`). This catches impossible
   combinations like February 30 — a case the native date picker used to reject
   automatically and that three independent dropdowns no longer prevent on their own.
   On failure, show the same inline `role="alert"` error pattern already used
   elsewhere in this form.
3. Format the validated date back into `'YYYY-MM-DD'` (zero-padded) and send it as
   `date_of_birth` in the existing `NewStudent` payload — **no schema or type change**;
   the Supabase column and `Student`/`NewStudent` types are untouched.

### Layout

Three selects in a `grid grid-cols-3 gap-3` row (matching the existing Gender/Grade/
Homeroom row's layout convention already in this form), each wrapped in the same
`<label className="block"><span className="text-sm text-gray-700">…</span><select …
className="mt-1 w-full rounded border px-3 py-2" /></label>` pattern used by every
other field in this form.

### Test impact

`tests/e2e/student-profile.spec.ts` currently does:

```ts
await page.getByRole('textbox', { name: 'Date of birth' }).fill('2015-06-01')
```

This will no longer resolve once the field is split. Update it to select from the
three dropdowns instead (e.g. `getByLabel('Day').selectOption('1')`,
`getByLabel('Month').selectOption('6')`, `getByLabel('Year').selectOption('2015')`).

## Out of scope

- No changes to the `students` table schema or `date_of_birth` column type.
- No changes to how date of birth is displayed elsewhere (e.g. any read-only profile
  view continues to render the stored ISO string as today).
- No live-updating clock on the dashboard (date only, per stakeholder decision).
