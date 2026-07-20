# Implementation Plan: Mobile-Friendly Navigation with Breadcrumbs & Persistent History

**Branch**: `002-mobile-nav-history` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-mobile-nav-history/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a role-filtered breadcrumb trail and a persistent mobile bottom tab bar to the
existing `AppLayout` shell so nurses/admins can jump back to any ancestor page in one
tap and reach top-level sections one-handed. Navigation history is derived from
`react-router-dom` location changes, persisted per signed-in user in `localStorage`
(not IndexedDB — this is UI-preference state, not clinical data subject to the offline
sync queue), and rehydrated on app load so context survives a refresh or restart. No
new backend tables, RLS policies, or Edge Functions are required — this is a
client-side routing/presentation feature layered on the existing route tree.

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19.2

**Primary Dependencies**: react-router-dom 7.18 (routing/history), Tailwind CSS 4.3
(responsive layout/breakpoints), existing `useSession`/`RequireRole` for role data —
no new runtime dependencies

**Storage**: Browser `localStorage`, keyed per authenticated user id, for persisted
navigation history/breadcrumb state (N/A for Supabase/Postgres — no schema change)

**Testing**: Vitest + React Testing Library (`tests/unit`, `tests/integration`),
Playwright (`tests/e2e`) — consistent with existing suites (e.g.
`tests/e2e/student-profile.spec.ts`)

**Target Platform**: Same PWA (Vite + `vite-plugin-pwa`) running in mobile and desktop
browsers; primary target viewport 320–430px per spec, existing desktop breakpoints
preserved

**Project Type**: Web application (single `src/` frontend + Supabase backend) — this
feature is frontend-only

**Performance Goals**: Restore last navigation context in under 2s after reopen
(SC-003); breadcrumb/tab rendering must not introduce measurable route-change jank
(no new network calls on navigation)

**Constraints**: Must continue functioning fully offline (spec FR-012) since it is
local client state only; must not leak role-restricted pages into crumbs/tabs (FR-009);
44x44px minimum touch targets (FR-006)

**Scale/Scope**: 4 existing top-level routes today (Dashboard, Students, New Visit,
Reports) plus their nested detail pages; tab bar surfaces the 3 role-gated top-level
sections (Dashboard, Students, Reports)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. FERPA-First Privacy** — PASS. No student health data is displayed, queried, or
  newly exposed; breadcrumb/tab labels are route names and student display names
  already rendered on the destination page today. `admin` role continues to be
  excluded from the Students section by the existing `RequireRole` gate (FR-009 reuses
  this, does not replace it).
- **II. Data Integrity & Audit Trail** — N/A. No writes to `visits`, `medications`,
  `medical_alerts`, or `audit_log`; no new database tables.
- **III. Offline-First Reliability** — PASS. Navigation state is local-only
  (`localStorage`), so it has no sync/queue/conflict behavior to define — it works
  offline by construction (FR-012). Confirmed no dependency on Dexie's clinical-data
  sync queue.
- **IV. Solo-Maintainable Simplicity** — PASS. Reuses `react-router-dom`'s existing
  history/location APIs and `localStorage`; no new state-management library, no new
  service, no new infrastructure category introduced.
- **V. Security & Compliance by Default** — PASS. Role filtering of crumbs/tabs is a
  presentation-layer convenience on top of the existing RLS/`RequireRole` enforcement,
  not a substitute for it — the constitution's requirement that role checks live in
  RLS is unaffected since this feature reads no protected data.

No violations; Complexity Tracking table not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-mobile-nav-history/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── routes/
│   ├── index.tsx              # router config — add breadcrumb/tab route metadata
│   ├── AppLayout.tsx           # existing shell — mount BottomTabBar + BreadcrumbTrail here
│   ├── RequireRole.tsx         # existing role gate — reused (not modified) to filter crumbs/tabs
│   └── DashboardPage.tsx
├── components/
│   ├── navigation/
│   │   ├── BreadcrumbTrail.tsx     # NEW — renders role-filtered ancestor path
│   │   ├── BottomTabBar.tsx        # NEW — mobile top-level section tabs
│   │   └── useNavigationHistory.ts # NEW — hook: builds/persists history, exposes crumbs
│   └── SyncStatusBanner.tsx    # existing, unaffected
├── lib/
│   ├── navigation/
│   │   └── navigationHistoryStore.ts  # NEW — localStorage read/write, keyed per user id
│   ├── auth/useSession.ts      # existing — source of current user id + role
│   └── offline/                # existing — not modified (nav history is not clinical data)
└── features/
    ├── students/StudentProfilePage.tsx   # unmodified logic; registers its breadcrumb label
    ├── visits/NewVisitPage.tsx
    └── reports/ReportsPage.tsx

tests/
├── unit/
│   └── navigation/                 # NEW — useNavigationHistory, navigationHistoryStore
├── integration/
│   └── navigation-breadcrumb.test.tsx  # NEW — role filtering, persistence across "restart"
└── e2e/
    └── mobile-navigation.spec.ts   # NEW — breadcrumb tap, tab bar, viewport reflow checks
```

**Structure Decision**: Single frontend project (existing `src/` Vite app, no backend
changes). New code is added as a `navigation` slice under `src/components/` (presentation)
and `src/lib/` (persistence hook/store), following the existing `features/<domain>` and
`lib/<domain>` convention already used by `offline` and `auth`. `AppLayout.tsx` is
extended, not replaced, to mount the new `BreadcrumbTrail` and `BottomTabBar`. No new
top-level directories.

## Complexity Tracking

*No Constitution Check violations — table not needed.*
