# Quickstart Guide: GitHub Projects Dashboard

**Feature:** GitHub Projects Dashboard
**Date:** 2025-09-29
**Phase:** 1 (Integration Test Plan)

## Overview

This guide provides manual testing scenarios for validating the GitHub Projects Dashboard implementation. Since E2E testing is deferred to a later iteration, use this guide for manual verification.

## Prerequisites

- Authenticated GitHub user with OAuth via Supabase
- At least a few GitHub Projects in the authenticated user's account (mix of open and closed)
- Database schema deployed (supabase-schema.sql)

## Test Scenarios

### Scenario 1: First-Time User Experience

**Objective:** Verify app initializes correctly for new user

**Steps:**
1. Authenticate with GitHub OAuth
2. Wait for app to load

**Expected Results:**
- ✅ Loading indicator displayed during initial fetch (NFR-003)
- ✅ Two system columns appear: "Unassigned" and "Closed"
- ✅ Open GitHub projects appear in Unassigned column
- ✅ Closed GitHub projects appear in Closed column
- ✅ Projects display: title, number, dates, item count, GitHub link
- ✅ Load completes within 5 seconds for <50 projects (NFR-001)
- ✅ No user-created columns or labels exist

**Error Cases:**
- ❌ If GitHub API fails: Error message displayed, requires reload (FR-002, FR-003)

---

### Scenario 2: Column Management

**Objective:** Verify column create, edit, reorder, delete operations

**Steps:**
1. Click "Add Column" button (or equivalent UI)
2. Enter title "In Progress", confirm
3. Create another column "Done"
4. Drag a project from Unassigned to "In Progress"
5. Edit "In Progress" column title to "WIP"
6. Drag "Done" column to reorder it before "WIP"
7. Delete "WIP" column

**Expected Results:**
- ✅ New columns appear immediately (optimistic)
- ✅ Column titles update instantly
- ✅ Column order changes immediately when dragged
- ✅ Projects move to Unassigned when column deleted
- ✅ All changes persist after page reload
- ✅ System columns (Unassigned, Closed) cannot be edited or deleted
- ✅ UI prevents creating more than 10 user columns (FR-010, FR-011)

**Error Cases:**
- ❌ If database error: Changes rollback, error toast shown

---

### Scenario 3: Project Management

**Objective:** Verify project drag-and-drop between columns

**Steps:**
1. Drag an open project from Unassigned to a user column
2. Drag a project from user column back to Unassigned
3. Attempt to drag a closed project out of Closed column
4. Reload page

**Expected Results:**
- ✅ Project moves instantly on drag (optimistic update)
- ✅ Closed projects cannot be dragged out of Closed column (FR-017, FR-019)
- ✅ Project assignments persist after reload
- ✅ All drag operations feel instantaneous (NFR-004)

---

### Scenario 4: Label Management

**Objective:** Verify label create, assign, filter operations

**Steps:**
1. Create label "important" with red color
2. Create label "backend" with blue color
3. Assign "important" label to 2-3 projects
4. Assign both labels to 1 project
5. Enter filter: `label:important` in filter bar
6. Clear filter
7. Delete "backend" label
8. Reload page

**Expected Results:**
- ✅ Labels appear on project cards immediately
- ✅ Multiple labels can be assigned to single project
- ✅ Filter updates in real-time as user types (FR-034)
- ✅ Only projects with "important" label shown when filtered
- ✅ Deleting label removes it from all projects (FR-023, FR-025)
- ✅ Label assignments persist after reload

---

### Scenario 5: Filtering

**Objective:** Verify Lucene-like filter syntax

**Steps:**
1. Enter filter: `title:API`
2. Clear, enter: `updated:>2024-12-01`
3. Clear, enter: `items:>5`
4. Clear, enter: `label:important AND updated:>2024-11-01`

**Expected Results:**
- ✅ Filter applies in real-time as user types (FR-036)
- ✅ Title filter shows only projects with "API" in title (FR-031)
- ✅ Date filter shows only projects updated after date (FR-033)
- ✅ Item count filter shows only projects with >5 items (FR-034)
- ✅ Combined filter shows projects matching all conditions (FR-031, FR-033, FR-034, FR-035)
- ✅ Empty results show visual indicator that filtering is active

---

### Scenario 6: Sorting

**Objective:** Verify column-level sorting

**Steps:**
1. In a column with multiple projects, click sort selector
2. Select "Title (A-Z)"
3. Change to "Last Updated (Newest First)"
4. Change to "Items (Most First)"
5. Reload page

**Expected Results:**
- ✅ Projects reorder instantly when sort changed (NFR-004)
- ✅ Each column maintains independent sort configuration (FR-039, FR-041)
- ✅ Sort persists after reload (FR-043)
- ✅ Available sort fields: title, number, items, updatedAt, createdAt, closedAt (FR-039)
- ✅ Both ascending and descending directions available (FR-040)

---

### Scenario 7: Reconciliation

**Objective:** Verify app syncs with GitHub changes

**Setup:** Make changes on GitHub (create/delete/close projects)

**Steps:**
1. On GitHub, create a new project "Test Project"
2. On GitHub, close an open project that's in a user column
3. On GitHub, delete a project
4. Reload the dashboard app

**Expected Results:**
- ✅ New project appears in Unassigned column (FR-045, FR-047)
- ✅ Closed project moved to Closed column (FR-049)
- ✅ Deleted project removed from app (FR-048)
- ✅ Other project column assignments preserved (FR-046)

---

### Scenario 8: Performance Under Load

**Objective:** Verify performance with many projects

**Prerequisites:** User account with 100+ GitHub Projects

**Steps:**
1. Authenticate and load app
2. Drag projects between columns
3. Apply filters
4. Change sort order

**Expected Results:**
- ✅ Initial load completes within 5 seconds (NFR-001, NFR-006)
- ✅ All post-load interactions remain instantaneous (NFR-004)
- ✅ No lag when dragging projects
- ✅ Filter applies in real-time even with 100+ projects
- ✅ Sort reorders instantly

---

## Quality Gates

Before considering the feature complete, verify:

1. **Type Check:** `npm run typecheck` passes with zero errors/warnings
2. **Build:** `npm run build` completes with zero warnings
3. **All Scenarios:** All test scenarios above pass
4. **Functional Requirements:** All 54 FRs in spec.md are satisfied
5. **Non-Functional Requirements:** All 7 NFRs in spec.md are satisfied

---

## Known Limitations (Current Iteration)

- No mock mode or E2E tests (deferred to later iteration)
- No automated test coverage
- Manual testing required for all scenarios

---

**Next Steps:** Once manual testing passes, proceed to Phase 6 (add mock system and E2E tests) in future iteration.