---

description: "Task list for Mobile-Friendly Navigation with Breadcrumbs & Persistent History"
---

# Tasks: Mobile-Friendly Navigation with Breadcrumbs & Persistent History

**Input**: Design documents from `/specs/002-mobile-nav-history/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — spec success criteria SC-002/SC-004 (thumb reach, 44x44 touch
targets) and functional requirements FR-007/FR-009/FR-013 (persistence, role
filtering, per-user isolation) need automated proof, and this repo's existing
convention (see `specs/001-school-nurse-management/tasks.md`) is to ship test tasks
alongside implementation rather than leave them optional.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Paths are relative to repo root, matching plan.md's Project Structure

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 [P] Create navigation TypeScript types (`NavigationHistoryRecord`, `NavigationEntry`, `BreadcrumbPath`, `BreadcrumbSegment`, `TabBarEntry`, `CrumbHandle`) in src/types/navigation.ts per data-model.md and contracts/navigation-contracts.md

**Checkpoint**: Shared types available for all navigation code to import.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add breadcrumb metadata to every breadcrumb-eligible route — **deviation**: implemented as a static `BREADCRUMB_ROUTES` registry in src/routes/breadcrumbs.ts (matched via `matchPath`) rather than `route.handle` + `useMatches()`, because the actual route tree is flat (`/students/:studentId/visits/new` is a sibling of `/students`, not nested under it — `StudentProfilePage` has no `<Outlet/>`), so `useMatches()` cannot recover the intended ancestor chain. Dashboard (`/`) and `/login` intentionally have no registry entry per spec FR-001
- [X] T003 [P] Implement `navigationHistoryStore.ts` (`loadHistory`/`saveHistory`, per-user namespaced key `nav-history:<userId>`, version check, entry cap, malformed-data fallback to `null`) in src/lib/navigation/navigationHistoryStore.ts per data-model.md Validation Rules and contracts §3
- [X] T004 Implement `useNavigationHistory()` hook (resolves the current path against `BREADCRUMB_ROUTES`, walks the `parent` chain, filters segments by the current `AppRole` against each route's `allow` list) in src/components/navigation/useNavigationHistory.ts (depends on T001, T002, T003) — **deviation**: no `setCurrentLabel` API; dropped along with the per-student crumb level (see T011)
- [X] T005 [P] Create `tabBarConfig.ts` (static `TabBarEntry[]`: Dashboard `/`, Students `/students`, Reports `/reports`, each with `allow: AppRole[]` matching the `allow` array already passed to that route's `RequireRole` in src/routes/index.tsx) in src/components/navigation/tabBarConfig.ts per contracts §4

**Checkpoint**: Shared navigation infra (types, route metadata, persistence store, hook, tab config) compiles and type-checks — story UI work can now begin.

---

## Phase 3: User Story 1 - Find the way back with a breadcrumb trail (Priority: P1) 🎯 MVP

**Goal**: Every page except Dashboard/login shows a role-filtered breadcrumb trail; tapping a non-current segment navigates there; a direct-linked page still gets a logical trail.

**Independent Test**: Navigate Dashboard → Students → a student profile → New Visit, then tap the "Students" crumb and confirm it lands on the student list, skipping the profile and visit screens; separately, load a student profile URL directly and confirm a breadcrumb still renders.

### Tests for User Story 1

- [X] T006 [P] [US1] Unit tests for `useNavigationHistory` (role-filtering ancestors, route-hierarchy fallback when no stored entry exists) in tests/unit/navigation/useNavigationHistory.test.tsx
- [X] T007 [P] [US1] Integration test: breadcrumb renders full path, current segment is non-interactive/visually distinct, direct-link (no prior navigation) still resolves a path in tests/integration/navigation-breadcrumb.test.tsx
- [X] T008 [P] [US1] E2E test: tapping a breadcrumb segment navigates directly to that ancestor page in tests/e2e/mobile-navigation.spec.ts

### Implementation for User Story 1

- [X] T009 [US1] Implement `BreadcrumbTrail` component, including the collapse pattern for narrow screens (`First / … / Second-to-last / Current`, per research.md §5) in src/components/navigation/BreadcrumbTrail.tsx
- [X] T010 [US1] Mount `BreadcrumbTrail` in src/routes/AppLayout.tsx
- [X] T011 [US1] **Descoped** (user decision during implementation — see spec.md Assumptions): `/students` has no per-student URL, so there is no distinct "student name" crumb level to wire. The student's name remains visible as the page heading in NewVisitPage.tsx (unchanged, already existed); no `setCurrentLabel` wiring was added to StudentProfilePage.tsx/ReportsPage.tsx since neither has a dynamic entity segment

**Checkpoint**: User Story 1 is independently functional and testable/demoable.

---

## Phase 4: User Story 2 - Reach any section with one thumb on mobile (Priority: P1)

**Goal**: A persistent, role-filtered bottom tab bar lets users switch top-level sections without stretching to a top corner.

**Independent Test**: At a 320–430px viewport, confirm the tab bar shows only the sections the signed-in role can access, all tabs are thumb-reachable, and tapping each switches sections with the active one highlighted.

### Tests for User Story 2

- [X] T012 [P] [US2] Integration test: tab bar entries filtered per `AppRole` (nurse/super_admin see Dashboard+Students+Reports, admin sees Dashboard+Reports only) in tests/integration/navigation-tabbar.test.tsx
- [X] T013 [P] [US2] E2E test: at a 320–430px viewport, tab bar is visible and positioned in the lower two-thirds of the screen, tapping a tab switches section and highlights it as active in tests/e2e/mobile-navigation.spec.ts

### Implementation for User Story 2

- [X] T014 [US2] Implement `BottomTabBar` component (fixed-position, visible only below the `md` breakpoint, 44x44px minimum touch targets, active-tab highlight) in src/components/navigation/BottomTabBar.tsx
- [X] T015 [US2] Mount `BottomTabBar` in src/routes/AppLayout.tsx (sequential edit — depends on T010's edit to the same file)

**Checkpoint**: User Stories 1 and 2 both independently functional; app is usable one-handed on mobile.

---

## Phase 5: User Story 3 - Resume where you left off after closing the app (Priority: P2)

**Goal**: Navigation history and the resulting breadcrumb trail persist across a full app close/reopen, scoped to the signed-in user.

**Independent Test**: Navigate a few levels deep, fully close the tab, reopen the app, and confirm the same page and breadcrumb trail are restored; sign in as a different seeded test user and confirm their history is empty, not the previous user's.

### Tests for User Story 3

- [X] T016 [P] [US3] Unit tests for `navigationHistoryStore`: round-trip persistence, per-user key isolation, version-mismatch/malformed-JSON discard, entry cap eviction in tests/unit/navigation/navigationHistoryStore.test.ts
- [X] T017 [P] [US3] E2E test: navigate deep, do a fresh `goto('/')` (simulating an installed PWA relaunch at `start_url`), confirm the last page/breadcrumb is restored; sign out and sign in as a different seeded user (`supabase/seed.sql`), confirm no history leaks between users in tests/e2e/mobile-navigation.spec.ts

### Implementation for User Story 3

- [X] T018 [US3] Wire `useNavigationHistory` to call `navigationHistoryStore.loadHistory` on mount (keyed by the current `useSession` user id) and `saveHistory` on each route change, plus a `getLastPath()` helper + a one-time restore effect in AppLayout.tsx that navigates away from `/` to the last saved path on initial mount (needed because the PWA's `start_url` is always `/`, so persisting history alone doesn't restore context without an explicit redirect) in src/components/navigation/useNavigationHistory.ts and src/routes/AppLayout.tsx
- [X] T019 [US3] Add graceful fallback to in-memory-only history when `localStorage` is unavailable or full (e.g., private browsing) via `isLocalStorageAvailable()` guards in `loadHistory`/`saveHistory` in src/lib/navigation/navigationHistoryStore.ts

**Checkpoint**: User Stories 1–3 all independently functional; history survives a full app restart.

---

## Phase 6: User Story 4 - Use every page comfortably on a phone (Priority: P2)

**Goal**: Every existing page (not just new nav chrome) reflows without horizontal scrolling and meets touch-target sizing at 320–430px.

**Independent Test**: Load Dashboard, Students, New Visit, and Reports at 320px and 430px widths; confirm no horizontal scrollbar and all interactive controls measure at least 44x44px.

### Tests for User Story 4

- [X] T020 [P] [US4] E2E test: no horizontal scroll (`document.documentElement.scrollWidth <= clientWidth`) and 44x44px minimum touch targets on the tab bar and breadcrumb at 320px and 430px in tests/e2e/mobile-navigation.spec.ts

### Implementation for User Story 4

- [X] T021 [P] [US4] Audit and fix responsive Tailwind classes for 320–430px in src/routes/DashboardPage.tsx — added `flex-wrap` and `min-h-11` to the action links
- [X] T022 [P] [US4] Audit and fix responsive Tailwind classes for 320–430px in src/features/students/StudentProfilePage.tsx — the actual overflow source was the roster sidebar's fixed `w-72`; stacked the roster/detail and photo/form layouts vertically below `sm:`, and fixed the width in src/features/students/StudentRoster.tsx (`w-72 shrink-0` → `w-full sm:w-72 sm:shrink-0`)
- [X] T023 [P] [US4] Audit and fix responsive Tailwind classes for 320–430px in src/features/visits/NewVisitPage.tsx — audited; already `max-w-2xl` with no fixed-width elements, no changes needed
- [X] T024 [P] [US4] Audit and fix responsive Tailwind classes for 320–430px in src/features/reports/ReportsPage.tsx — stacked the email/"Email PDF" row vertically below `sm:` and gave the button a `min-h-11` target
- [X] T025 [US4] Increase touch target sizing (minimum 44x44px) on the header sign-out button and other controls in src/routes/AppLayout.tsx

**Checkpoint**: All four user stories functional; the app is usable end-to-end at 320–430px.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T026 [P] Run quickstart.md's manual validation across all 5 scenarios — covered by the automated tests/e2e/mobile-navigation.spec.ts suite (all scenarios except the "delete student mid-session" edge case, which is unexercised — no direct-delete-while-viewing test exists in this repo for any feature)
- [X] T027 Run `npm run lint` and `npm run build` to confirm no regressions — both clean; one pre-existing TS "implicit any in self-referential loop" quirk fixed with an explicit type annotation in useNavigationHistory.ts
- [X] T028 [P] Run `npm run test:unit`, `npm run test:integration`, and `npm run test:e2e` and confirm all new and existing suites pass — 53 unit/integration + 13 e2e, all green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — no dependency on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational; T015 (AppLayout mount) is sequential with T010, since both edit src/routes/AppLayout.tsx — otherwise independent of US1
- **User Story 3 (Phase 5)**: Depends on Foundational and on US1's `useNavigationHistory`/`BreadcrumbTrail` existing (T004, T009), since it extends the same hook — not independent of US1's implementation, though it is independently testable once US1 is in place
- **User Story 4 (Phase 6)**: Depends only on Foundational (types) — otherwise fully independent of US1–US3, touches different files entirely
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### Within Each User Story

- Tests written before implementation
- Store/hook infra before components that consume it
- Component implementation before mounting in AppLayout
- Story complete before moving to the next priority

### Parallel Opportunities

- T001 (Setup) has no dependencies
- T003 and T005 (Foundational) can run in parallel with each other; T002 can run in parallel with both; T004 depends on all three
- All test tasks within a story phase (marked [P]) can run in parallel
- US4's tasks (T020–T024) can run fully in parallel with US1–US3, since they touch entirely different files (existing page components, not new navigation code)
- Once Foundational (Phase 2) completes, US1 and US4 can start in parallel; US2 can start in parallel with US1 but its AppLayout edit (T015) must land after US1's (T010); US3 must start after US1's T004/T009 exist

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit tests for useNavigationHistory in tests/unit/navigation/useNavigationHistory.test.ts"
Task: "Integration test: breadcrumb path + non-interactive current crumb + direct-link fallback in tests/integration/navigation-breadcrumb.test.tsx"
Task: "E2E test: breadcrumb tap navigates to ancestor in tests/e2e/mobile-navigation.spec.ts"
```

## Parallel Example: User Story 4

```bash
# Launch all page audits for User Story 4 together (different files, no shared state):
Task: "Audit and fix responsive Tailwind classes in src/routes/DashboardPage.tsx"
Task: "Audit and fix responsive Tailwind classes in src/features/students/StudentProfilePage.tsx"
Task: "Audit and fix responsive Tailwind classes in src/features/visits/NewVisitPage.tsx"
Task: "Audit and fix responsive Tailwind classes in src/features/reports/ReportsPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md scenario 1 independently
5. Deploy/demo if ready — breadcrumb wayfinding alone already resolves the primary "how do I get back" complaint

### Incremental Delivery

1. Setup + Foundational → shared infra ready
2. Add User Story 1 → validate → demo (MVP: breadcrumb trail)
3. Add User Story 2 → validate → demo (thumb-reachable tab bar)
4. Add User Story 3 → validate → demo (survives app restart)
5. Add User Story 4 → validate → demo (touch-friendly across all existing pages)
6. Polish phase confirms everything together via quickstart.md and full test suite

### Parallel Team Strategy

With multiple developers, after Foundational completes:

- Developer A: User Story 1, then User Story 3 (extends the same hook)
- Developer B: User Story 2 (coordinate the AppLayout.tsx edit with Developer A)
- Developer C: User Story 4 (fully independent files)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No new runtime dependencies, no Supabase schema/RLS changes — see plan.md Summary
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
