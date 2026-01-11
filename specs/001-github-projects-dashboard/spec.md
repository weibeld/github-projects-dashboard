# Feature Specification: GitHub Projects Dashboard

**Feature Branch:** `001-github-projects-dashboard`
**Created:** 2025-09-29
**Status:** Draft
**Input:** User description: "GitHub Projects Dashboard - Display and organize GitHub Projects in a Kanban-style board with user columns, labels, filtering, and sorting"

## Execution Flow (main)

```
1. Parse user description from Input
   → Feature describes comprehensive project management UI
2. Extract key concepts from description
   → Actors: GitHub user
   → Actions: view, organize, filter, sort, label projects
   → Data: GitHub Projects, columns, labels, metadata
   → Constraints: read-only GitHub access, data persistence
3. For each unclear aspect:
   → Authentication method specified (GitHub OAuth via Supabase)
   → Data reconciliation strategy defined
4. Fill User Scenarios & Testing section
   → Primary flow: load projects, organize in columns
   → Secondary flows: filtering, labelling, sorting
5. Generate Functional Requirements
   → All requirements testable and complete
6. Identify Key Entities
   → Projects, Columns, Labels, Sort Configuration
7. Run Review Checklist
   → No [NEEDS CLARIFICATION] markers
   → No implementation details in requirements
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements

- **Mandatory sections:** Must be completed for every feature
- **Optional sections:** Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

---

## Clarifications

### Session 2025-09-29

- Q: When reconciliation detects that a GitHub Project has been modified on GitHub (e.g., title changed, item count changed), should the app update its local display data? → A: Yes, always sync all project metadata from GitHub on startup. Only project-specific metadata saved in the database is the column assignment.
- Q: What is the acceptable maximum loading time for the initial GitHub Projects data fetch on application startup? → A: <5 seconds for typical user (≤20 projects) is acceptable with loading indicator; ideally <2 seconds. Post-load operations on locally stored data must be instantaneous with optimistic database updates.
- Q: What is the expected maximum number of GitHub Projects a single user might have? → A: App is targeted at individual users (not organizations). Typical usage <50 projects, but must handle up to 200 projects.
- Q: When GitHub API fails during startup (network issue, rate limiting, auth failure), should the app block entirely, show retry button, auto-retry, or load cached data? → A: Display error message and require user to reload the app (such errors are not expected to be frequent).
- Q: Should there be a maximum limit on the number of user columns a user can create? → A: Yes, limit to 10 user columns (users not expected to create many columns; limit prevents errors and edge cases).

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

A GitHub user wants to organise their GitHub Projects in a visual Kanban-style board. On application startup, the system loads all of the user's GitHub Projects from GitHub and displays them as cards on a board with customisable columns. The user can create user columns (e.g. "Todo", "Doing", "Done") and drag projects between columns to organise them. Each project card displays key information: title, creation date, last updated date, number of items, and a link to the project on GitHub.

The system provides two special columns: "Unassigned" for projects not yet organised into user columns, and "Closed" for closed GitHub Projects. Closed projects are automatically placed in the Closed column and cannot be moved elsewhere.

The user can create colour-coded labels (e.g. "app", "important") and assign them to projects for additional categorisation. They can filter the displayed projects using a search syntax (e.g. "label:important" or date ranges) with real-time updates as they type. Within each column, projects can be automatically sorted by various criteria (title, dates, item count) in ascending or descending order, with each column maintaining its own independent sort configuration.

All user customisations (column definitions, project assignments, labels, sort settings) are persistently saved. On subsequent launches, the application reconciles with GitHub's current state: new projects appear in Unassigned, deleted projects are removed from the board, and projects whose open/closed status changed are moved to the appropriate column.

### Acceptance Scenarios

1. **Given** the user opens the application for the first time, **When** the application loads, **Then** all GitHub Projects are displayed as cards in the Unassigned column
2. **Given** projects are displayed, **When** the user creates a user column "In Progress" and drags a project into it, **Then** the project moves to that column and remains there on next launch
3. **Given** multiple projects are displayed, **When** the user creates a label "important" with a red colour and assigns it to selected projects, **Then** those projects display the label and can be filtered using "label:important"
4. **Given** projects are displayed in a column, **When** the user types a filter expression "updated:>2025-01-01", **Then** only projects updated after that date are shown in real-time
5. **Given** a column contains multiple projects, **When** the user sets the column sort to "title descending", **Then** projects in that column are automatically sorted by title Z-A
6. **Given** a column contains projects, **When** the user deletes that column, **Then** all projects in it move to the Unassigned column
7. **Given** a GitHub Project is closed on GitHub, **When** the user relaunches the application, **Then** that project automatically moves to the Closed column
8. **Given** a new GitHub Project is created on GitHub, **When** the user relaunches the application, **Then** the new project appears in the Unassigned column
9. **Given** multiple user columns exist, **When** the user drags a column to a new position, **Then** the column order changes and persists
10. **Given** a column exists, **When** the user edits the column title from "Todo" to "Backlog", **Then** the column title updates and persists

### Edge Cases

- What happens when a GitHub Project is deleted on GitHub but was assigned to a user column in the app?
  - The project is removed from the app's data entirely during reconciliation
- What happens when the user applies a filter that matches no projects?
  - All columns appear empty with a visual indicator that filtering is active
- What happens when a closed project is reopened on GitHub?
  - On next app launch, the project moves from Closed column to Unassigned column
- What happens when the user tries to drag a closed project out of the Closed column?
  - The drag operation is prevented; closed projects cannot be reassigned
- What happens when the user deletes a label that is assigned to projects?
  - The label is removed from all projects that had it assigned
- What happens when the same GitHub user opens the app in multiple devices/browsers simultaneously?
  - Deferred to future iteration (see "Future Considerations" section). Current behavior: last write wins
- What happens when GitHub API is unavailable on startup?
  - Application displays an error message requiring user to reload the app (no retry mechanism or cached data fallback)

## Requirements *(mandatory)*

### Functional Requirements

**Data Loading & Display:**

- **FR-001:** System MUST load all GitHub Projects for the authenticated user on application startup
- **FR-002:** System MUST display an error message and block application usage if GitHub API fails during startup (network issues, rate limiting, authentication failures)
- **FR-003:** System MUST require user to manually reload the application to retry after startup failure
- **FR-004:** System MUST display each project as a card showing title, creation date, last updated date, number of items, and GitHub link
- **FR-005:** System MUST display projects in a Kanban-style board layout with multiple columns
- **FR-006:** System MUST provide a system-defined "Unassigned" column for projects not assigned to user columns
- **FR-007:** System MUST provide a system-defined "Closed" column for closed GitHub Projects
- **FR-008:** System MUST automatically place closed projects in the Closed column regardless of user assignments

**Column Management:**

- **FR-009:** Users MUST be able to create new user columns with user-defined titles
- **FR-010:** System MUST enforce a maximum limit of 10 user columns per user
- **FR-011:** System MUST prevent creation of additional columns once the limit is reached
- **FR-012:** Users MUST be able to edit the title of user columns
- **FR-013:** Users MUST be able to delete user columns
- **FR-014:** System MUST move all projects from a deleted column to the Unassigned column
- **FR-015:** System MUST prevent deletion or editing of the Unassigned and Closed system columns
- **FR-016:** Users MUST be able to reorder columns by moving them to new positions
- **FR-017:** System MUST persist column definitions, titles, and order across sessions

**Project Organisation:**

- **FR-018:** Users MUST be able to drag and drop projects between columns (except to and from the Closed column)
- **FR-019:** System MUST prevent dragging closed projects out of the Closed column
- **FR-020:** System MUST persist project-to-column assignments across sessions
- **FR-021:** System MUST allow a project to be assigned to at most one user column at a time

**Labels:**

- **FR-022:** Users MUST be able to create labels with a title and colour
- **FR-023:** Users MUST be able to edit label titles and colours
- **FR-024:** Users MUST be able to delete labels
- **FR-025:** System MUST remove deleted labels from all projects that had them assigned
- **FR-026:** Users MUST be able to assign multiple labels to a single project
- **FR-027:** Users MUST be able to remove labels from projects
- **FR-028:** System MUST persist label definitions and assignments across sessions
- **FR-029:** System MUST display assigned labels on project cards

**Filtering:**

- **FR-030:** System MUST provide a filter bar accepting Lucene-like syntax filter expressions
- **FR-031:** System MUST support filtering by project title
- **FR-032:** System MUST support filtering by creation date
- **FR-033:** System MUST support filtering by last updated date
- **FR-034:** System MUST support filtering by number of items
- **FR-035:** System MUST support filtering by labels (e.g. "label:important")
- **FR-036:** System MUST update displayed projects in real-time as the user types the filter expression
- **FR-037:** System MUST hide projects that do not match the active filter expression

**Sorting:**

- **FR-038:** Users MUST be able to configure automatic sorting for projects within each column
- **FR-039:** System MUST support sorting by title, project number, creation date, last updated date, closed date, and number of items
- **FR-040:** System MUST support both ascending and descending sort directions
- **FR-041:** Each column MUST maintain its own independent sort configuration
- **FR-042:** System MUST automatically reorder projects in a column when sort configuration changes
- **FR-043:** System MUST persist sort configurations for each column across sessions

**Data Persistence & Reconciliation:**

- **FR-044:** System MUST persist user customisations (columns, labels, sort configs) and project column assignments per user in a database
- **FR-045:** System MUST load all project metadata (title, dates, item count, URL, status) fresh from GitHub on each application startup
- **FR-046:** System MUST reconcile persisted column assignments with current GitHub project list on startup
- **FR-047:** System MUST add newly created GitHub Projects to the Unassigned column during reconciliation
- **FR-048:** System MUST remove column assignments for GitHub Projects that have been deleted on GitHub
- **FR-049:** System MUST move projects to the Closed column when their status changed to closed on GitHub
- **FR-050:** System MUST move projects from the Closed to the Unassigned column when they are reopened on GitHub
- **FR-051:** System MUST operate read-only with respect to GitHub data (no modifications to GitHub Projects)

**Authentication:**

- **FR-052:** System MUST authenticate users via GitHub OAuth
- **FR-053:** System MUST load projects only for the authenticated GitHub user

### Non-Functional Requirements

**Performance:**

- **NFR-001:** System MUST complete initial GitHub Projects data load within 5 seconds for typical users (≤50 projects)
- **NFR-002:** System SHOULD complete initial data load within 2 seconds when possible
- **NFR-003:** System MUST display a loading indicator during initial data fetch
- **NFR-004:** System MUST provide instantaneous UI response for all post-load user interactions (drag-drop, filtering, sorting, labelling)
- **NFR-005:** System MUST use optimistic updates for database persistence operations to maintain instantaneous UI responsiveness

**Scalability:**

- **NFR-006:** System MUST support up to 200 GitHub Projects per user without performance degradation
- **NFR-007:** System is targeted at individual users (not organizational accounts)

### Key Entities *(include if feature involves data)*

- **GitHub Project:** A project from GitHub's Projects feature with attributes including title, creation date, last updated date, number of items, GitHub URL, and open/closed status. Source of truth is GitHub's API.

- **Column:** A user-defined or system-defined vertical section of the board. User columns have editable titles and can be created, edited, deleted, and reordered. System columns (Unassigned, Closed) have fixed semantics and cannot be deleted or edited.

- **Label:** A user-defined tag with a title and colour that can be assigned to projects for categorisation. Labels can be created, edited, deleted, and assigned to multiple projects.

- **Project Assignment:** The relationship between a project and a column, indicating which column currently contains that project. Closed projects are always assigned to the Closed column. Other projects can be assigned to at most one user column or remain in Unassigned.

- **Sort Configuration:** Per-column settings defining how projects within that column are automatically ordered, including sort field (title, creation date, last updated date, number of items) and direction (ascending/descending).

- **Filter Expression:** A Lucene-like query string entered by the user to filter visible projects based on criteria like title, dates, item count, and labels.

### Current Iteration Scope

**This iteration focuses on:**
- Completing remaining business layer operations (backend.ts)
- Column operations: update title, sort configuration, reorder
- Label operations: create, update, delete, assign/remove from projects

**All infrastructure is already in place:**
- Base layer (GitHub client, database client, auth)
- Data stores and UI data layer
- Reconciliation logic
- Existing operations (column create/delete, project move)

### Future Iterations *(deferred)*

**Next Iteration - Filter & UI Layer:**
- Filter utilities (liqe integration)
- UI components (ProjectCard, Column, FilterBar, etc.)
- App integration and layout
- Drag-and-drop interactions
- Polish and styling

**Future Considerations:**
- **Multi-Device Concurrency:** Prevent data inconsistencies when the same user opens the app in multiple devices/browsers simultaneously. Options include:
  - Session locking (prevent concurrent sessions)
  - Real-time sync (auto-update all instances via Supabase subscriptions)
  - Current behavior: Last write wins; potential for data inconsistencies

---

## Review & Acceptance Checklist

*GATE: Automated checks run during main() execution*

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
