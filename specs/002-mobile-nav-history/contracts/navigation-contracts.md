# Contracts: Mobile-Friendly Navigation

This feature has no external/network API surface. The contracts below are internal
interface boundaries between the new navigation code and the rest of the app, so
different pieces (route config, layout, persistence) can be built/tested against a
stable shape.

## 1. Route crumb metadata contract

Every route in `src/routes/index.tsx` that should appear in a breadcrumb declares a
`handle`:

```ts
type CrumbHandle = {
  crumb: string | ((params: Record<string, string | undefined>) => string)
}
```

- Static routes (e.g., Reports) use a plain string: `handle: { crumb: 'Reports' }`.
- Parameterized routes (e.g., a student profile) use a resolver function; the resolver
  MAY return a placeholder (e.g., `'Student'`) synchronously and the page itself
  updates the resolved label (e.g., the actual student name) via
  `useNavigationHistory().setCurrentLabel(name)` once data loads — this satisfies
  FR-008 (a working crumb exists immediately, even before entity data resolves) and
  data-model.md's `NavigationEntry.label`.
- The Dashboard (`index: true`) and `/login` routes intentionally have **no** `crumb`
  handle — the spec excludes them from the trail (FR-001).
- `BreadcrumbTrail` consumes this exclusively via `useMatches()`; it does not read
  route config directly, so route restructuring only requires updating `handle`, not
  the trail component.

## 2. `useNavigationHistory()` hook contract

```ts
interface UseNavigationHistory {
  /** Root-to-current breadcrumb, role-filtered, ready to render. */
  breadcrumb: BreadcrumbPath
  /** Override the just-resolved label for the current route's entry (e.g., student name). */
  setCurrentLabel(label: string): void
}
```

- Consumers: `BreadcrumbTrail` (reads `breadcrumb`), individual feature pages that
  need to supply an entity name (e.g., `StudentProfilePage` calls `setCurrentLabel`
  once the student record loads).
- Internally responsible for: reading/writing `navigationHistoryStore`, merging
  `useMatches()` route hierarchy with persisted `NavigationEntry` labels, and
  filtering out any ancestor segment the current `AppRole` (from `useSession`) is not
  in that route's `allow` list for (FR-009) — reusing the same `allow: AppRole[]`
  arrays already passed to `RequireRole` in `src/routes/index.tsx`, not a duplicate
  permission list.
- MUST NOT throw or return a broken state when `localStorage` is unavailable/full
  (e.g., private browsing) — falls back to in-memory-only history for that session.

## 3. `navigationHistoryStore` contract

```ts
function loadHistory(userId: string): NavigationHistoryRecord | null
function saveHistory(record: NavigationHistoryRecord): void
```

- `loadHistory` returns `null` (not a throw) for: no stored record, a record for a
  different `userId`, a `version` mismatch, or malformed JSON — all treated as "start
  fresh," per data-model.md's Validation Rules.
- `saveHistory` enforces the entry cap (data-model.md) before writing and is the only
  code path allowed to write the `nav-history:<userId>` key.
- Pure functions, no React dependency — directly unit-testable (see
  `tests/unit/navigation/`).

## 4. `TabBarEntry` config contract

```ts
interface TabBarEntry {
  path: string
  label: string
  icon: IconName
  allow: AppRole[]
}
```

- Declared once (e.g., `src/components/navigation/tabBarConfig.ts`) as a small static
  array; `BottomTabBar` filters it against the current session's `role` from
  `useSession()`.
- `allow` values MUST match the `allow` array already given to that same route's
  `RequireRole` in `src/routes/index.tsx` — this is a convention, not an enforced
  type link, so a code-review/test checklist item (see quickstart.md) verifies they
  stay in sync whenever a route's role gate changes.

## 5. Component prop contracts

```ts
// src/components/navigation/BreadcrumbTrail.tsx
interface BreadcrumbTrailProps {} // reads useNavigationHistory() internally, no props required

// src/components/navigation/BottomTabBar.tsx
interface BottomTabBarProps {} // reads useSession() + tabBarConfig internally
```

Both are self-contained (no required props) so `AppLayout.tsx` can mount them with a
single line each, keeping the layout diff minimal.
