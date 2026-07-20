# Implementation Plan: Dashboard Date Display & Split Date-of-Birth Fields

**Design**: [2026-07-20-dashboard-date-dob-split-design.md](2026-07-20-dashboard-date-dob-split-design.md)

## Steps

1. **DashboardPage.tsx** — add a static formatted-today line under the "Dashboard"
   heading, computed via `toLocaleDateString` as specified in the design. No new
   state, no interval.

2. **StudentProfileForm.tsx** — replace the single `date` input with:
   - Three `dobDay`/`dobMonth`/`dobYear` state values, parsed from
     `student?.date_of_birth` on edit (split `'YYYY-MM-DD'` on `-`), empty on create.
   - Day/Month/Year `<select>` row (grid-cols-3, matching the existing
     Gender/Grade/Homeroom row styling), Month options built from a static
     `MONTH_NAMES` array, Year options generated as `currentYear - 3` down to
     `currentYear - 21`.
   - A `buildDateOfBirth(day, month, year)` helper: returns the zero-padded
     `'YYYY-MM-DD'` string if the combination is a real calendar date (round-trip
     check via `Date`), otherwise `null`.
   - On submit: if any of the three is unset, or `buildDateOfBirth` returns `null`,
     set the existing `error` state and stop (same pattern the form already uses for
     server errors) instead of calling Supabase.

3. **tests/e2e/student-profile.spec.ts** — replace the single
   `fill('2015-06-01')` call with three `selectOption` calls against the new
   Day/Month/Year selects.

4. **Verify**: run `npm run test:unit`, `npm run test:e2e` (student-profile.spec.ts
   at minimum, full suite if quick), `npm run lint`, `npm run build`.

## Explicitly out of scope (per design)

- No schema/type changes to `date_of_birth` or `NewStudent`/`Student`.
- No changes to other places `date_of_birth` is displayed.
- No live clock on the dashboard.
