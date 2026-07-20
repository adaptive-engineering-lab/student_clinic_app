# Quickstart: Mobile-Friendly Navigation with Breadcrumbs & Persistent History

## Prerequisites

Same as the base app (see `specs/001-school-nurse-management/quickstart.md`):

```bash
supabase start
supabase db reset
npm install
npm run dev
```

No new environment variables, migrations, or services are required for this feature
(see plan.md — client-side only, no schema change).

## Validating each user story end-to-end

Use a mobile viewport (browser devtools device toolbar, 320–430px wide) for stories
1, 2, and 4; story 3 can be checked at any width.

1. **Breadcrumb trail (US1)**: Sign in as `nurse`. Navigate Dashboard → Students → a
   student profile → "New Visit". Confirm the breadcrumb reads
   `Dashboard / Students / <Student Name>` on the profile and adds `/ New Visit` on
   the visit page. Tap the "Students" crumb — confirm you land on the student list,
   not the profile or visit page. Confirm the current page's crumb is visually
   distinct and does not respond to a tap. Then load a student profile URL directly
   (paste the link, fresh tab) and confirm a breadcrumb still renders (see
   contracts/navigation-contracts.md §1 — route `handle` fallback).

2. **Bottom tab bar (US2)**: At a 320–430px viewport, confirm a bottom tab bar is
   visible with entries scoped to the signed-in role — `nurse`/`super_admin` see
   Dashboard, Students, Reports; `admin` sees Dashboard and Reports only (Students is
   withheld, matching the existing `RequireRole` gate). Tap each visible tab and
   confirm the correct section loads and its tab is highlighted as active.

3. **Persistent history after restart (US3)**: Navigate a few levels deep (e.g., into
   a student profile), then fully close the browser tab (not just refresh) and reopen
   the app URL. Confirm you land back on the same page with the same breadcrumb
   trail. Sign out and sign in as a different test user (see seeded accounts in
   `supabase/seed.sql`); confirm that user does not see the previous user's history.

4. **Touch-friendly layout (US4)**: At 320px and 430px widths, load Dashboard,
   Students, New Visit, and Reports. Confirm no horizontal scrollbar appears on any
   of them. Using devtools' element inspector, spot-check a few nav elements
   (a tab, a breadcrumb link) and confirm their rendered box is at least 44x44px.

5. **Edge cases** (spec.md Edge Cases section):
   - Collapse check: navigate deep enough that the breadcrumb would overflow a 320px
     screen; confirm it collapses to `First / … / Second-to-last / Current` with a
     working expand control, rather than wrapping or overflowing.
   - Offline check: go offline (devtools), then tap a breadcrumb crumb or a tab —
     confirm navigation still works (it's local state, no network call).
   - Deleted-target check: navigate to a student profile, delete that student via
     another session/tab, then tap back to that student's stale breadcrumb entry —
     confirm a clear "not found" state, not a crash.

## Automated test entry points

- `npm run test:unit` — Vitest coverage for `navigationHistoryStore` and
  `useNavigationHistory` (persistence, per-user isolation, entry cap, malformed-data
  fallback — see data-model.md Validation Rules)
- `npm run test:integration` — role-filtering behavior of `BreadcrumbTrail` /
  `BottomTabBar` against each `AppRole`, verified against the same `allow` lists used
  by `RequireRole` in `src/routes/index.tsx`
- `npm run test:e2e` — Playwright coverage of the 5 scenarios above, including
  viewport-based touch-target and no-horizontal-scroll assertions (see research.md §6)
