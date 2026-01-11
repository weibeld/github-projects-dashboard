# Tasks: GitHub Projects Dashboard

**Input:** Design documents from `/specs/001-github-projects-dashboard/`
**Prerequisites:** plan.md (✅), data-model.md (✅), quickstart.md (✅)

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → ✅ Tech stack: Svelte 5, TypeScript, Supabase, Tailwind CSS
   → ✅ Structure: Single project, layered architecture
   → ✅ Base layer complete, business layer partial
2. Load design documents:
   → data-model.md: ✅ Database schema, type definitions, data flow
   → quickstart.md: ✅ Manual test scenarios (for future iterations)
   → No contracts/ (not a REST API project)
3. Generate tasks for current iteration:
   → Business operations: 9 missing functions in backend.ts
   → Validation: typecheck and build verification
4. Apply task rules:
   → Business operations: All [P] (independent functions in same file)
   → Validation: Sequential (after business ops complete)
5. Number tasks sequentially (T001-T011)
6. Dependencies: Business ops (T001-T009) → Validation (T010-T011)
7. Return: SUCCESS (11 tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]:** Can run in parallel (different files or independent functions in same file, no logical dependencies)
- Include exact file paths in descriptions

## Path Conventions

Single project structure:
- Source: `src/lib/business/`, `src/lib/utils/`, `src/components/`, `src/`
- Repository root at: `/Users/dw/Desktop/github-projects-dashboard/`

---

## Current Iteration: Business Layer Operations

**CRITICAL:** These operations follow the established pattern in backend.ts:
1. Validate inputs
2. Update dataStore optimistically
3. Persist to database (async)
4. On error: call `reloadDatabaseDataIntoDataStore()` and throw

**All tasks are [P] - independent functions in same file**

- [ ] **T001 [P]** Implement `updateColumnTitle(columnId: string, title: string): Promise<void>` in `src/lib/business/backend.ts`
  - Validate: title not empty, column exists, column is not system column
  - Optimistic: Update `dataStore.database.columns` with new title
  - Persist: `databaseClient.columnUpdateTitle(columnId, userId, title)`
  - Error: Rollback via `reloadDatabaseDataIntoDataStore()`

- [ ] **T002 [P]** Implement `updateColumnSortField(columnId: string, sortField: string): Promise<void>` in `src/lib/business/backend.ts`
  - Validate: sortField is valid ('title', 'number', 'items', 'updatedAt', 'createdAt', 'closedAt')
  - Optimistic: Update column's sortField in dataStore
  - Persist: `databaseClient.columnUpdateSortField(columnId, userId, sortField)`
  - Error: Rollback

- [ ] **T003 [P]** Implement `updateColumnSortDirection(columnId: string, sortDirection: string): Promise<void>` in `src/lib/business/backend.ts`
  - Validate: sortDirection is 'asc' or 'desc'
  - Optimistic: Update column's sortDirection in dataStore
  - Persist: `databaseClient.columnUpdateSortDirection(columnId, userId, sortDirection)`
  - Error: Rollback

- [ ] **T004 [P]** Implement `moveColumnToPosition(columnId: string, position: number): Promise<void>` in `src/lib/business/backend.ts`
  - Validate: column exists, is user column, position valid
  - Optimistic: Reorder all columns, update positions
  - Persist: Batch `columnUpdatePosition()` for affected columns
  - Error: Rollback

- [ ] **T005 [P]** Implement `createLabel(title: string, color: string, textColor: string): Promise<void>` in `src/lib/business/backend.ts`
  - Validate: title not empty, color/textColor valid hex
  - Optimistic: Add placeholder label to dataStore with temp ID
  - Persist: `databaseClient.labelCreate()`
  - Success: Replace temp label with real one from DB
  - Error: Rollback

- [ ] **T006 [P]** Implement `updateLabel(labelId: string, title: string, color: string, textColor: string): Promise<void>` in `src/lib/business/backend.ts`
  - Validate: label exists, title not empty, colors valid
  - Optimistic: Update label in dataStore
  - Persist: `databaseClient.labelUpdate()`
  - Error: Rollback

- [ ] **T007 [P]** Implement `deleteLabel(labelId: string): Promise<void>` in `src/lib/business/backend.ts`
  - Find all project_labels with this labelId
  - Optimistic: Remove label and all associations from dataStore
  - Persist: Delete all `projectLabelRelationDelete()`, then `labelDelete()`
  - Error: Rollback

- [ ] **T008 [P]** Implement `assignLabelToProject(projectId: string, labelId: string): Promise<void>` in `src/lib/business/backend.ts`
  - Validate: project and label exist, not already assigned
  - Optimistic: Add to dataStore.database.project_labels
  - Persist: `databaseClient.projectLabelRelationCreate()`
  - Error: Rollback

- [ ] **T009 [P]** Implement `removeLabelFromProject(projectId: string, labelId: string): Promise<void>` in `src/lib/business/backend.ts`
  - Optimistic: Remove from dataStore.database.project_labels
  - Persist: `databaseClient.projectLabelRelationDelete()`
  - Error: Rollback

---

## Validation

- [ ] **T010** Run typecheck and build, ensure zero warnings
  - Run: `npm run typecheck`
  - Run: `npm run build`
  - Fix any TypeScript errors or warnings
  - Ensure strict mode compliance
  - Meets Quality Gate requirement

- [ ] **T011** Verify business operations integrate with existing data stores
  - Verify all 9 operations update dataStore correctly
  - Verify uiData (derived store) recomputes after operations
  - Test optimistic updates and error rollback pattern
  - Confirm all operations follow established backend.ts patterns

---

## Deferred to Future Iterations

**Next Iteration - Filter & UI Layer:**
- Filter utilities (liqe integration, filtered data store)
- UI components (ProjectCard, Column, FilterBar, LabelBadge, SortSelector, etc.)
- App integration (dashboard layout, drag-and-drop)
- Polish and full manual testing

**Future:**
- Mock system integration
- E2E testing suite

---

## Dependencies (Current Iteration)

**Phase Dependencies:**
- T001-T009 (Business operations) → T010-T011 (Validation)

**Within-Phase Dependencies:**
- None - all business operations (T001-T009) can run in parallel

**No Dependencies (parallelizable):**
- All of T001-T009 (independent functions in backend.ts)

---

## Validation Checklist

*GATE: Must be satisfied before marking iteration complete*

- [ ] All 9 business operations implemented (T001-T009)
- [ ] TypeScript strict mode passes (T010)
- [ ] Business operations verified (T011)
- [ ] No tasks modify same file as another [P] task ✅ Verified
- [ ] Each task specifies exact file path ✅ Verified
- [ ] Parallel tasks truly independent ✅ Verified

---

**Total Tasks:** 11
**Parallelizable:** 9 (T001-T009)
**Sequential:** 2 (T010-T011)
