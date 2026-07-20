# Phase 1 Data Model: Mobile-Friendly Navigation with Breadcrumbs & Persistent History

This feature introduces no Supabase/Postgres schema changes (no migration required).
The "data" here is client-side view/persistence state only.

## NavigationHistoryRecord (persisted)

Stored in `localStorage` under key `nav-history:<userId>` (see research.md §2–3).

| Field        | Type                          | Notes |
|--------------|--------------------------------|-------|
| `userId`     | `string`                      | Supabase auth user id; used to namespace the key and re-validate on load (FR-013). |
| `version`    | `number`                      | Schema version for the persisted shape, so a future format change can migrate/discard stale records instead of crashing on parse. |
| `entries`    | `NavigationEntry[]`            | Ordered oldest → newest; capped (see Validation Rules). |
| `updatedAt`  | `string` (ISO 8601 timestamp)  | Last time the record was written; used only for diagnostics, not business logic. |

### NavigationEntry

| Field        | Type                | Notes |
|--------------|---------------------|-------|
| `path`       | `string`            | The route path visited, e.g. `/students/abc123/visits/new`. |
| `label`      | `string`            | Human-readable crumb label at the time of the visit (e.g. resolved student name), captured so history remains meaningful even if the underlying entity is later renamed or deleted. |
| `visitedAt`  | `string` (ISO 8601) | When this entry was recorded. |

**Validation rules**:
- `entries` MUST be capped at a fixed maximum (e.g., 25) — oldest entries drop off
  first — so `localStorage` usage stays bounded; this is UI convenience state, not an
  audit trail (Constitution Principle II's audit-trail requirement applies to clinical
  tables, not this feature).
- A record whose `userId` does not match the currently authenticated user MUST be
  ignored (treated as absent) on load, satisfying FR-013.
- A record whose `version` does not match the current expected version MUST be
  discarded (fresh start) rather than partially parsed.

## BreadcrumbPath (derived, not persisted)

Computed at render time from: (a) the current route's position in the static route
hierarchy (`handle.crumb` metadata per route, see contracts/navigation-contracts.md),
(b) the current user's role (to filter out any ancestor the user cannot access —
FR-009), and (c) the matching `NavigationEntry.label`, if present, for entity-named
segments.

| Field           | Type                | Notes |
|-----------------|---------------------|-------|
| `segments`      | `BreadcrumbSegment[]` | Ordered root → current. |
| `isCollapsed`   | `boolean`            | True when `segments` exceeds the width-based collapse threshold (FR-010) and the middle is hidden behind an expandable control. |

### BreadcrumbSegment

| Field        | Type      | Notes |
|--------------|-----------|-------|
| `path`       | `string`  | Target route; `null`/absent for the current (non-navigable) segment. |
| `label`      | `string`  | Display text. |
| `isCurrent`  | `boolean` | True only for the last segment (FR-003 — non-interactive, visually distinct). |

## TabBarEntry (static config, not persisted)

| Field    | Type       | Notes |
|----------|------------|-------|
| `path`   | `string`   | Top-level route, e.g. `/`, `/students`, `/reports`. |
| `label`  | `string`   | Tab label. |
| `icon`   | identifier | Icon reference for the tab. |
| `allow`  | `Role[]`   | Reuses the existing `Role` type from `RequireRole`/`useSession` — the same list already passed to each route's `RequireRole allow={...}` guard, so tab visibility and route access can't drift apart. |

## Relationships

- `NavigationHistoryRecord` (1) → `NavigationEntry` (many), scoped to one `userId`.
- `BreadcrumbPath` is derived per-render from the current route + the active
  `NavigationHistoryRecord` + the static route hierarchy; it is never itself persisted.
- `TabBarEntry` list is static app configuration, filtered per-render by the current
  session's role — no relationship to persisted history.
