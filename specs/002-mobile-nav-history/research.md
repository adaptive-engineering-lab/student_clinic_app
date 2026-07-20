# Phase 0 Research: Mobile-Friendly Navigation with Breadcrumbs & Persistent History

All three scope-defining questions from the spec (breadcrumb vs. back button, mobile
shell shape, history persistence depth) were already resolved interactively during
`/speckit-specify` — see spec.md Assumptions. This phase covers the remaining
technical unknowns needed to implement those decisions against the existing stack.

## 1. How to derive the breadcrumb path

**Decision**: Use React Router 7's route `handle` field to declare a static crumb
label (or label-resolver function) per route in `src/routes/index.tsx`, combined with
route params (e.g., `:studentId`) resolved via `useMatches()`. For entity-named crumbs
(e.g., a student's name instead of their ID), the destination page resolves the label
at render time and reports it back via the `useNavigationHistory` hook, which the
`BreadcrumbTrail` reads.

**Rationale**: Route-config-driven crumbs guarantee FR-008 (a direct-linked page still
gets a logical breadcrumb, since the trail is derived from the route tree, not solely
from "pages visited this session"). Runtime history is layered on top only to capture
same-session ordering when the user actually navigated hierarchically (e.g., which
student they came from), not to invent the base hierarchy.

**Alternatives considered**:
- *Pure runtime history stack* (record every visited path, render it as the trail) —
  rejected: breaks on direct links/refresh with empty history, and doesn't naturally
  produce an "ancestor path" (a stack of visited pages isn't the same as a
  hierarchy — e.g., Dashboard → Reports → Dashboard → Students would render a
  nonsensical trail).
- *Third-party breadcrumb library* — rejected per Constitution IV (no new dependency
  for something React Router's existing `handle`/`useMatches` API already supports).

## 2. Where to persist navigation history

**Decision**: `localStorage`, under a key namespaced by the authenticated user's id
(e.g., `nav-history:<userId>`), read/written by a small `navigationHistoryStore.ts`
module with a synchronous get/set API.

**Rationale**: This is UI-preference/session-continuity state, not clinical data.
Constitution Principle III's offline queue (Dexie) exists specifically for data that
must survive network loss and later sync to Supabase (visits, medication
administrations, communication logs) — persisted nav history has no server
counterpart and nothing to sync, so routing it through Dexie/the sync queue would
misuse that mechanism and add unnecessary coupling. `localStorage` is synchronous
(simpler than IndexedDB for small key-value data), already available with no new
dependency, and naturally scoped per browser profile.

**Alternatives considered**:
- *Dexie/IndexedDB* — rejected: no sync/conflict semantics apply here; would pull
  this feature into the offline-sync code path for no benefit.
- *sessionStorage* — rejected: spec FR-007 requires history to survive a full app
  restart, and `sessionStorage` is cleared when the tab/app closes.
- *Server-side persistence (Supabase table)* — rejected: adds a network round-trip
  and a new table for pure UI state; violates Constitution IV (simplicity) and gains
  nothing since this is a single-device, per-browser feature per the spec's
  Assumptions (no cross-device sync required).

## 3. Multi-user-on-one-device isolation

**Decision**: Namespace the `localStorage` key by user id (from `useSession`) and
clear/ignore any stored history whose key doesn't match the currently authenticated
user on load.

**Rationale**: Satisfies FR-013 directly. Reusing the same `useSession` hook already
used for role checks keeps this consistent with existing auth state rather than
introducing a second source of truth for "who is logged in."

**Alternatives considered**: Single shared key wiped on every sign-out — rejected as
more fragile (relies on sign-out always firing) versus namespacing, which is correct
even if a session ends abnormally (e.g., token expiry per Constitution V's 30-minute
inactivity timeout).

## 4. Mobile bottom tab bar pattern

**Decision**: A `position: fixed` bottom bar, rendered by `AppLayout`, visible only
below Tailwind's `md` breakpoint (matches the spec's 320–430px target range and
leaves desktop/tablet layouts, which already work via the existing top header,
untouched). Tab entries are computed by filtering a static `{ path, label, icon,
allow: Role[] }` list against the current user's role (same `Role` type already used
by `RequireRole`).

**Rationale**: Fixed-bottom tab bars are the standard mobile pattern for thumb reach
(spec SC-002); scoping it to one breakpoint avoids duplicating navigation chrome on
desktop where the existing header already works well. Filtering with the same `Role`
type `RequireRole` uses avoids defining a second, divergent permissions model (FR-009).

**Alternatives considered**: Hamburger/drawer menu — rejected by the earlier
clarification answer (bottom tab bar + top back arrow was explicitly chosen over a
menu-based shell).

## 5. Breadcrumb collapsing on narrow screens

**Decision**: When the rendered trail would exceed the viewport width, collapse to
`First / … / Second-to-last / Current`, where `…` is a tappable control that expands
the full trail inline (same pattern used by GitHub and Material Design breadcrumbs).

**Rationale**: Keeps the first (root/Dashboard) and nearest ancestor visible — the two
most useful jump targets — while guaranteeing FR-010 (no overflow/unreadable wrap) at
the spec's 320px minimum width.

**Alternatives considered**: Horizontal scroll within the breadcrumb — rejected: spec
FR-011 already bans horizontal scrolling as a pattern for the app generally, and a
scrollable breadcrumb is a poor discoverability pattern on touch.

## 6. Verifying touch targets and viewport reflow in tests

**Decision**: Extend Playwright e2e coverage (`tests/e2e/mobile-navigation.spec.ts`)
using `page.setViewportSize({ width: 320..430, height: ... })` plus
`boundingBox()` assertions (`width >= 44 && height >= 44`) on tab/crumb elements, and
a `document.documentElement.scrollWidth <= viewport width` check per page for FR-011.
Unit/integration coverage (Vitest + RTL) targets the `useNavigationHistory` hook and
`navigationHistoryStore` in isolation (persistence, per-user isolation, role
filtering) without a browser.

**Rationale**: Matches the existing test split already used by this repo (Playwright
for real-browser/viewport behavior in `tests/e2e`, Vitest/RTL for logic in
`tests/unit`/`tests/integration`) — no new test tooling introduced.

**Alternatives considered**: Visual regression/screenshot diffing — out of scope; not
part of the existing toolchain and not required to satisfy the spec's testable
functional requirements.

## Outcome

No unresolved `NEEDS CLARIFICATION` items remain. All decisions reuse existing
dependencies (`react-router-dom`, `localStorage`, Tailwind breakpoints, existing
`Role`/`useSession` types, existing Vitest/Playwright split) per Constitution
Principle IV.
