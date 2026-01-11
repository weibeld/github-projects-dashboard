# Implementation Plan: GitHub Projects Dashboard

**Branch:** `001-github-projects-dashboard` | **Date:** 2025-09-29 | **Spec:** [spec.md](./spec.md)
**Input:** Feature specification from `/specs/001-github-projects-dashboard/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → ✅ Spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ All clarifications resolved in spec
   → ✅ Project Type: Single project (existing Svelte 5 web app)
   → ✅ Structure Decision: Existing layered architecture
3. Fill the Constitution Check section
   → ✅ Evaluated against constitution v1.0.0
4. Evaluate Constitution Check section
   → ✅ No violations detected
   → ✅ Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → ✅ Technology decisions already made (existing stack)
6. Execute Phase 1 → data-model.md, quickstart.md
   → ✅ Generated design artifacts
7. Re-evaluate Constitution Check section
   → ✅ No new violations
   → ✅ Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach
   → ✅ Task strategy documented
9. STOP - Ready for /tasks command
```

## Summary

**Current Iteration Scope:** Complete remaining business layer operations in backend.ts (column management and label operations).

This iteration documents and validates the **existing implementation** of the GitHub Projects Dashboard application. The core architecture and base layer are complete:

**Implemented:**
- ✅ Database schema (supabase-schema.sql) with 4 tables
- ✅ Base layer clients complete (githubClient, databaseClient)
- ✅ Data store pattern (dataStore.ts) - in-memory mirror of database and GitHub data
- ✅ UI data layer (uiData.ts) - denormalized derived view of the data store with sorting
- ✅ Base types (types.ts) - all RawGitHub, RawColumn, RawLabel, etc.
- ✅ Auth operations (login, logout, session management)
- ✅ App initialization and reconciliation logic
- ✅ Column operations (create, delete)
- ✅ Project move operation

**Current Iteration - To Implement:**
- ⚠️ Business layer operations (9 functions in backend.ts):
  - Column: update title, update sort field, update sort direction, reorder columns
  - Label: create, update, delete
  - Project labels: assign label to project, remove label from project

**Deferred to Next Iteration (Filter & UI Layer):**
- Filtering functionality (liqe integration)
- UI components (ProjectCard, Column, FilterBar, etc.)
- App.svelte dashboard layout and UI wiring
- Drag-and-drop interactions
- File organisation (e.g. split backend.ts if needed)

**Deferred to Future Iterations:**
- Mock system integration
- E2E testing

**Technical Approach:** Complete 9 remaining business operations in backend.ts following established optimistic update pattern. Commit and proceed to next iteration for UI layer.

## Technical Context

**Language/Version:** TypeScript 5.9.2, Svelte 5.23.1
**Primary Dependencies:** Vite 6.3.1, Supabase JS 2.49.4, Tailwind CSS 3.4.17, liqe 3.8.3 (Lucene-like query), dayjs 1.11.13, lucide-svelte 0.503.0
**Storage:** Supabase PostgreSQL (schema already defined and deployed)
**Testing:** Deferred to later iteration
**Target Platform:** Web browser (deployed to GitHub Pages)
**Project Type:** Single project (existing web app with established architecture)
**Performance Goals:** <5s initial load (≤50 projects), <2s ideal; instantaneous post-load interactions
**Constraints:** Support up to 200 projects per user, max 10 user columns, read-only GitHub access
**Scale/Scope:** Individual users (not organizations), optimistic UI with background persistence

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Layered Architecture (NON-NEGOTIABLE):** ✅ PASS
- Existing layered structure (Base/Business/UI) is maintained
- Data store pattern preserves clean separation: raw data (base) → business logic → UI data (derived)
- No changes to established architecture
- All new code follows existing patterns

**II. Simplicity Over Tooling:** ✅ PASS
- All required dependencies already present (liqe for filtering, dayjs for dates)
- Drag-and-drop uses native HTML5 APIs (no library needed)
- No new build tools or frameworks introduced
- Database schema already designed and deployed

**III. End-to-End Testing:** ✅ PASS (deferred)
- E2E testing will be added in later iteration
- No impact on current implementation phase

**IV. Strict TypeScript (NON-NEGOTIABLE):** ✅ PASS
- All existing code uses strict TypeScript
- Type definitions already in place (base/types.ts)
- Compile-time validation via existing `tsc &&` prefix in all scripts
- UI types defined in uiData.ts

**Quality Gates:** ✅ PASS
- `npm run typecheck` validates all code
- `npm run build` must complete with zero warnings
- Tests deferred to later iteration

**Conclusion:** No constitutional violations. Implementation follows established patterns.

## Project Structure

### Documentation (this feature)

```
specs/001-github-projects-dashboard/
├── plan.md              # This file (/plan command output)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

**Current Implementation State:**

```
supabase-schema.sql                          # ✅ COMPLETE - Database schema deployed

src/lib/base/
├── types.ts                                 # ✅ COMPLETE - All type definitions
├── clients/
│   ├── auth.ts                              # ✅ COMPLETE - OAuth operations
│   ├── github.ts                            # ✅ COMPLETE - queryGitHubProjects()
│   └── database.ts                          # ✅ COMPLETE - All CRUD operations

src/lib/business/
├── dataStore.ts                             # ✅ COMPLETE - In-memory data store
├── uiData.ts                                # ✅ COMPLETE - Derived UI data with sorting
├── authStore.ts                             # ✅ COMPLETE - Auth state management
├── uiAuth.ts                                # ✅ COMPLETE - Derived auth UI state
├── backend.ts                               # ⚠️ PARTIAL - Need more operations:
│   ├── ✅ login(), logout(), checkAuthAndInitAuthStore()
│   ├── ✅ loadDataAndInitDataStore(), reloadGitHubData()
│   ├── ✅ createSystemColumns(), reconcileDatabaseProjects()
│   ├── ✅ createColumn(), deleteColumn()
│   ├── ✅ moveProjectToColumn()
│   ├── ❌ updateColumnTitle()
│   ├── ❌ updateColumnSortField()
│   ├── ❌ updateColumnSortDirection()
│   ├── ❌ moveColumnToPosition()
│   ├── ❌ createLabel(), updateLabel(), deleteLabel()
│   └── ❌ assignLabelToProject(), removeLabelFromProject()
└── types.ts                                 # ✅ COMPLETE - Business constants

src/lib/utils/
└── [NEED]                                   # ❌ Filter utilities (liqe integration)

src/components/
└── [NEED]                                   # ❌ All UI components

src/App.svelte                               # ⚠️ PARTIAL - Need dashboard layout

tests/
└── [DEFERRED]                               # ⏸️ Testing deferred to later iteration
```

**Structure Decision:** Existing architecture is well-designed and requires no changes. Remaining work is straightforward extension of existing patterns.

## Phase 0: Research (Technology Decisions)

All technology decisions have been made and are already integrated into the codebase:

1. **Frontend Framework:** Svelte 5.23.1 with TypeScript 5.9.2 ✅
2. **Backend/Storage:** Supabase (PostgreSQL + Auth) ✅
3. **Build Tool:** Vite 6.3.1 ✅
4. **Styling:** Tailwind CSS 3.4.17 with GitHub-themed colors ✅
5. **Filter Query Parsing:** liqe 3.8.3 (Lucene-like syntax) ✅
6. **Date Handling:** dayjs 1.11.13 ✅
7. **Drag-and-Drop:** Native HTML5 Drag and Drop API (to implement)
8. **GitHub API:** GraphQL API v4 - queryGitHubProjects() already implemented ✅
9. **Database Schema:** 4 tables deployed ✅
10. **State Management:** dataStore.ts + uiData.ts pattern ✅
11. **Optimistic Updates:** Update dataStore immediately, persist to DB async ✅

No research document needed - all decisions documented in existing codebase.

## Phase 1: Design & Contracts

### Data Model

**Database Schema:** Already defined in `supabase-schema.sql` and documented in existing code.

**Tables:**
1. **columns** - User columns with embedded sort configuration (type, sortField, sortDirection)
2. **labels** - User labels with color and textColor
3. **projects** - Project-to-column assignments (GitHub project ID → column ID)
4. **project_labels** - Many-to-many junction table

**Data Flow:**

1. **Startup:**
   ```
   App.svelte onMount()
   → backend.checkAuthAndInitAuthStore()
   → backend.loadDataAndInitDataStore()
      → githubClient.queryGitHubProjects() → dataStore.github
      → databaseClient.columnRead() → dataStore.database.columns
      → databaseClient.projectRead() → dataStore.database.projects
      → databaseClient.labelRead() → dataStore.database.labels
      → databaseClient.projectLabelRelationRead() → dataStore.database.project_labels
      → reconcileDatabaseProjects() (sync GitHub reality with DB)
   → uiData (derived store updates automatically)
   → UI renders
   ```

2. **User Action (optimistic):**
   ```
   UI Component
   → backend.operationName()
      → Update dataStore immediately (optimistic)
      → uiData recomputes → UI updates instantly
      → databaseClient.operation() (async persist)
      → On error: reloadDatabaseDataIntoDataStore() + throw error
   ```

**See data-model.md for complete documentation.**

### Base Layer Client Contracts

**GitHub Client** (src/lib/base/clients/github.ts): ✅ **COMPLETE**
```typescript
export async function queryGitHubProjects(token: string): Promise<RawGitHub[]>
```

**Database Client** (src/lib/base/clients/database.ts): ✅ **COMPLETE**

All CRUD operations implemented:
- Columns: `columnRead()`, `columnCreate()`, `columnUpdatePosition()`, `columnDelete()`
- Labels: `labelRead()`, `labelCreate()`, `labelUpdate()`, `labelDelete()`
- Projects: `projectRead()`, `projectCreate()`, `projectUpdateColumn()`, `projectDelete()`
- Project Labels: `projectLabelRelationRead()`, `projectLabelRelationCreate()`, `projectLabelRelationDelete()`

### Business Layer Operations

**File:** `src/lib/business/backend.ts`

**Already Implemented:** ✅
```typescript
// Auth
export async function login(): Promise<void>
export async function logout(): Promise<void>
export async function checkAuthAndInitAuthStore(): Promise<void>

// Initialization
export async function loadDataAndInitDataStore(): Promise<void>
export async function reloadGitHubData(): Promise<void>
async function createSystemColumns(): Promise<void>
async function reconcileDatabaseProjects(): Promise<RawProject[]>
async function reloadDatabaseDataIntoDataStore(): Promise<void>

// Columns
export async function createColumn(title: string, afterColumnId: string): Promise<void>
export async function deleteColumn(columnId: string): Promise<void>

// Projects
export async function moveProjectToColumn(projectId: string, columnId: string): Promise<void>
```

**To Implement:** ❌
```typescript
// Column operations
export async function updateColumnTitle(columnId: string, title: string): Promise<void>
export async function updateColumnSortField(columnId: string, sortField: string): Promise<void>
export async function updateColumnSortDirection(columnId: string, sortDirection: string): Promise<void>
export async function moveColumnToPosition(columnId: string, position: number): Promise<void>

// Label operations
export async function createLabel(title: string, color: string, textColor: string): Promise<void>
export async function updateLabel(labelId: string, title: string, color: string, textColor: string): Promise<void>
export async function deleteLabel(labelId: string): Promise<void>

// Project label operations
export async function assignLabelToProject(projectId: string, labelId: string): Promise<void>
export async function removeLabelFromProject(projectId: string, labelId: string): Promise<void>
```

**Pattern (already established in existing operations):**
1. Validate inputs
2. Update dataStore optimistically
3. Persist to database (async)
4. On error: call reloadDatabaseDataIntoDataStore() and throw

### Integration Test Plan

**Deferred to later iteration** - see quickstart.md for manual testing guide.

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy for Current Iteration:**

**Business Layer - Complete Missing Operations (This Iteration):**
- T001: Implement updateColumnTitle() in backend.ts
- T002: Implement updateColumnSortField() in backend.ts
- T003: Implement updateColumnSortDirection() in backend.ts
- T004: Implement moveColumnToPosition() in backend.ts
- T005: Implement createLabel() in backend.ts
- T006: Implement updateLabel() in backend.ts
- T007: Implement deleteLabel() in backend.ts
- T008: Implement assignLabelToProject() in backend.ts
- T009: Implement removeLabelFromProject() in backend.ts

**Validation:**
- T010: Run typecheck and build, ensure zero warnings
- T011: Verify business operations integrate with existing data stores

**Deferred to Next Iteration:**
- Filter utilities (liqe integration, filtered data store)
- All UI components (ProjectCard, Column, FilterBar, labels, sorting selectors)
- App integration and layout
- Drag-and-drop interactions
- Full manual testing suite

**Ordering Strategy:**
- Business layer operations (T001-T009) - Can all be done in parallel
- Validation (T010-T011) - After business operations complete

**Estimated Output:** 11 numbered, focused tasks in tasks.md for current iteration

**IMPORTANT:** This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3:** Task execution (/tasks command creates tasks.md)
**Phase 4:** Implementation (execute tasks.md following constitutional principles)
**Phase 5:** Validation (manual testing per quickstart.md, typecheck, build)
**Phase 6:** Testing (add mock system and E2E tests in future iteration)

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

No violations detected. Table remains empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _N/A_ | _N/A_ | _N/A_ |

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status:**
- [x] Phase 0: Research complete (all technology decisions already made)
- [x] Phase 1: Design complete (schema and data structures exist)
- [x] Phase 2: Task planning complete (describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed
- [ ] Phase 6: Testing (future iteration)

**Gate Status:**
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (via /clarify)
- [x] Complexity deviations documented (none)

---
*Based on Constitution v1.0.0 - See `/.specify/memory/constitution.md`*
