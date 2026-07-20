# Feature Specification: Mobile-Friendly Navigation with Breadcrumbs & Persistent History

**Feature Branch**: `002-mobile-nav-history`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Add browser-back/history-aware navigation to the app: when a user selects/navigates to a page, they should be able to return to the previously visited page (like a back button / breadcrumb trail). The overall user flow and UI must be mobile-phone friendly (touch-friendly, responsive layouts, thumb-reachable navigation)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find the way back with a breadcrumb trail (Priority: P1)

A nurse drills several levels deep (e.g., Dashboard → Students → Jane Doe → New Visit) and needs to return to any point in that path, not just the immediately prior screen, without losing their place.

**Why this priority**: This is the core ask — wayfinding through nested screens is the main friction point today (the app has no back/breadcrumb affordance at all), and it blocks every other workflow if users get lost.

**Independent Test**: Can be fully tested by navigating Dashboard → Students → a student profile → New Visit, then tapping the "Students" crumb and confirming it returns directly to the student list, skipping the profile and visit screens.

**Acceptance Scenarios**:

1. **Given** a user has navigated Dashboard → Students, **When** the Students page renders, **Then** a breadcrumb trail showing "Dashboard / Students" is visible; selecting a specific student does not add its own crumb level (student selection is in-page state, not a distinct URL, per Assumptions), but the student's name remains visible as the page heading.
2. **Given** a visible breadcrumb trail, **When** the user taps a non-current segment, **Then** the app navigates directly to that page.
3. **Given** the current page's breadcrumb segment, **When** the user views it, **Then** it is visually distinguished from the other segments and is not tappable.
4. **Given** a user arrives at a page via a direct link with no prior in-app navigation, **When** the page renders, **Then** a logical breadcrumb path is still shown based on that page's place in the app hierarchy.

---

### User Story 2 - Reach any section with one thumb on mobile (Priority: P1)

A nurse using a phone one-handed needs to switch between Dashboard, Students, and Reports without stretching to a top corner or hunting through menus.

**Why this priority**: The current header is a simple top bar with no mobile-specific affordances; on a phone this is the primary daily interaction surface, so it must work for one-handed use from day one.

**Independent Test**: Can be fully tested on a 375px-wide viewport by confirming a bottom tab bar is present, all tab targets fall in the lower two-thirds of the screen, and tapping each tab switches sections correctly.

**Acceptance Scenarios**:

1. **Given** a user is signed in on a mobile viewport, **When** any in-app page renders, **Then** a persistent bottom tab bar shows an entry for each top-level section the user's role can access.
2. **Given** the bottom tab bar, **When** the user is on a given section, **Then** that section's tab is visually highlighted as active.
3. **Given** a user's role does not permit access to a section (e.g., `admin` cannot access Students), **When** the tab bar renders, **Then** that section's tab does not appear.

---

### User Story 3 - Resume where you left off after closing the app (Priority: P2)

A nurse gets interrupted mid-task, closes the browser/PWA, and reopens it later expecting to land back in the same navigation context rather than starting over at the dashboard.

**Why this priority**: Valuable continuity improvement, but the app is still usable without it (User Stories 1–2 deliver the core wayfinding value on their own).

**Independent Test**: Can be fully tested by navigating a few levels deep, fully closing the app/tab, reopening it, and confirming the breadcrumb trail and current page match where the user left off.

**Acceptance Scenarios**:

1. **Given** a user has navigated several pages deep, **When** they close and reopen the app, **Then** they are returned to the last page visited with the same breadcrumb trail intact.
2. **Given** a restored session, **When** the user taps a breadcrumb segment from before the restart, **Then** navigation behaves identically to a same-session breadcrumb tap.
3. **Given** a different user signs in on the same device, **When** the app loads, **Then** the previous user's navigation history is not shown to them.

---

### User Story 4 - Use every page comfortably on a phone (Priority: P2)

A nurse fills out forms (visit logs, medication administration, student profiles) on a phone screen and needs every control to be reachable and tappable without pinch-zooming or mis-tapping.

**Why this priority**: Supports the explicit "mobile-phone friendly" requirement across the whole app; independent of the navigation-history work in Stories 1–3.

**Independent Test**: Can be fully tested by loading each existing page (Dashboard, Students, New Visit, Reports) at a 320–430px viewport width and confirming no horizontal scrolling and all controls meet minimum touch-target size.

**Acceptance Scenarios**:

1. **Given** any page in the app, **When** viewed at widths between 320px and 430px, **Then** all content reflows to fit without horizontal scrolling.
2. **Given** any interactive control (button, link, tab, breadcrumb segment), **When** measured, **Then** its touch target is at least 44x44px.

---

### Edge Cases

- What happens when the breadcrumb path would overflow a narrow screen (e.g., Dashboard / Students / Jane Doe / Visit)? The trail must collapse (e.g., first/last segment plus an expandable ellipsis for the middle) rather than overflow or wrap unreadably.
- How does the system handle a back/breadcrumb tap when the target page's data no longer exists (e.g., a student profile was deleted since it was last visited)? The user should see a clear "not found" state rather than a broken screen.
- How does the system handle a breadcrumb crumb pointing to a page the user's role no longer permits (e.g., role changed mid-session)? That crumb must not be shown or must not be navigable.
- What happens when the user is offline? Breadcrumb and tab navigation must continue to work since it is local, client-side state with no network dependency.
- What happens on first-ever login with no navigation history yet? The dashboard renders with no breadcrumb (it is the root), and the tab bar still functions normally.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a breadcrumb trail on every page except the dashboard/home and login, showing the full navigation path from the dashboard to the current page.
- **FR-002**: Each breadcrumb segment except the current page MUST be tappable and navigate directly to that page.
- **FR-003**: The current page's breadcrumb segment MUST be visually distinguished from other segments and MUST NOT be interactive.
- **FR-004**: System MUST provide a persistent bottom tab bar on mobile viewports listing each top-level section the signed-in user's role can access.
- **FR-005**: The tab corresponding to the currently active section MUST be visually highlighted.
- **FR-006**: All interactive navigation elements (tabs, breadcrumb segments) MUST have a minimum touch target of 44x44px.
- **FR-007**: Navigation history MUST persist across page refresh and full app restart, per signed-in user, so the user resumes their last breadcrumb context on return.
- **FR-008**: When a page is reached via a direct link with no prior in-app navigation, the system MUST construct a logical breadcrumb path from the app's information hierarchy rather than showing an empty or broken trail.
- **FR-009**: Breadcrumb segments and tab bar entries MUST only include pages the current user's role is permitted to access.
- **FR-010**: On narrow viewports, a breadcrumb trail that exceeds available width MUST collapse (e.g., truncate middle segments behind an expandable control) rather than overflow or wrap unreadably.
- **FR-011**: All page layouts MUST reflow to remain fully usable without horizontal scrolling at viewport widths from 320px to 430px.
- **FR-012**: Breadcrumb, tab, and history navigation MUST continue to function while the app is offline.
- **FR-013**: Persisted navigation history MUST be scoped to the signed-in user and MUST NOT be shown to a different user who signs in on the same device.

### Key Entities

- **Navigation History**: The persisted record of a user's visited-page path within the app, used to reconstruct the breadcrumb trail and restore context after a refresh or restart. Key attributes: ordered list of visited pages, associated user, last-updated time.
- **Breadcrumb Path**: The resolved, role-filtered sequence of ancestor pages shown for the current page, derived from either the stored navigation history or the page's default position in the app hierarchy when no history exists.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any page, a user can return to any previously visited page in their current path in a single tap.
- **SC-002**: On mobile viewports, all primary navigation actions (switching sections, jumping to a prior page) are reachable within the lower two-thirds of the screen, without the user repositioning their hand.
- **SC-003**: Reopening the app after closing it mid-task restores the user to their last navigation context in under 2 seconds.
- **SC-004**: Zero navigation elements fall below the 44x44px minimum touch target across tested mobile viewports (320–430px).
- **SC-005**: In usability testing, 95% of users locate and successfully use back/breadcrumb navigation without additional instruction.

## Assumptions

- "Return to the previously visited page" is delivered as a full breadcrumb trail (jump to any ancestor page), not merely a single-step back button, per stakeholder decision.
- The mobile navigation shell is a persistent bottom tab bar (top-level sections) combined with the breadcrumb trail for within-section depth; there is no separate hamburger menu.
- Navigation history is persisted per authenticated user (e.g., keyed by user ID in local storage) and survives app restart, but is not synced across different devices.
- Top-level tab bar sections map to the existing role-gated routes: Dashboard, Students, Reports. Visit and medication screens are reached through Students and appear only in the breadcrumb, not as their own top-level tabs.
- This feature governs navigation chrome and history only; it does not alter what data or actions each role can see or perform (the role/RLS boundaries defined in the `001-school-nurse-management` spec remain authoritative).
- Target mobile viewport range is 320px–430px wide; existing tablet/desktop responsive behavior is preserved.
- The Students page has no per-student URL today (selection is in-page React state, not a route param). Per an implementation-time decision, the breadcrumb stops at route granularity ("Dashboard / Students") rather than adding a third "student name" crumb level — adding real student deep-links was judged out of scope for a navigation-chrome feature. The student's name is still shown as the page heading, just not as its own tappable crumb.
