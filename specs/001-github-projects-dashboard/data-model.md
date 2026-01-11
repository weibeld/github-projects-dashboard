# Data Model: GitHub Projects Dashboard

**Feature:** GitHub Projects Dashboard
**Date:** 2025-09-29
**Phase:** 1 (Design & Contracts)

## Overview

This document describes the data model for the GitHub Projects Dashboard. The implementation uses a three-layer data architecture:

1. **Database** (Supabase PostgreSQL) - Persistent storage for user customizations
2. **Data Store** (`src/lib/business/dataStore.ts`) - In-memory mirror of database and GitHub data
3. **UI Data** (`src/lib/business/uiData.ts`) - Denormalized derived view of the data store with sorting

## Database Schema

**Source:** `supabase-schema.sql` (already deployed)

### Tables

**1. columns** - User and system columns with embedded sort configuration
```sql
id UUID, user_id TEXT, title TEXT, position INTEGER,
type TEXT, sort_field TEXT, sort_direction TEXT
```
- `type`: 'user' | 'unassigned' | 'closed' (managed by business layer)
- `sort_field`: 'title' | 'number' | 'items' | 'updatedAt' | 'createdAt' | 'closedAt'
- `sort_direction`: 'asc' | 'desc'

**2. labels** - User-defined labels
```sql
id UUID, user_id TEXT, title TEXT, color TEXT, text_color TEXT
```

**3. projects** - Project-to-column assignments
```sql
id TEXT (GitHub project ID), user_id TEXT, column_id UUID
```

**4. project_labels** - Junction table for project-label relationships
```sql
project_id TEXT, label_id UUID, user_id TEXT
```

All tables have RLS policies ensuring users can only access their own data.

## Type Definitions

**Source:** `src/lib/base/types.ts`

### Raw Types (1:1 with DB tables and GitHub API)

```typescript
// From GitHub API
export type RawGitHub = {
  id: string; number: number; title: string; url: string;
  isPublic: boolean; isClosed: boolean;
  createdAt: Date; updatedAt: Date | null; closedAt: Date | null;
  items: number;
}

// From database
export interface RawColumn {
  id: string; userId: string; title: string; position: number;
  type: string; sortField: string; sortDirection: string;
}

export interface RawLabel {
  id: string; userId: string; title: string;
  color: string; textColor: string;
}

export interface RawProject {
  id: string; userId: string; columnId: string;
}

export interface RawProjectLabel {
  projectId: string; labelId: string; userId: string;
}
```

### UI Types (denormalized for rendering)

**Source:** `src/lib/business/uiData.ts`

```typescript
export interface UiData {
  columns: UiColumn[];
}

export interface UiColumn {
  id: string; title: string; position: number;
  type: string; sortField: string; sortDirection: string;
  projects: UiProject[];  // Filtered and sorted
}

export interface UiProject {
  // All GitHub data
  id: string; title: string; number: number; url: string;
  updatedAt: Date; closedAt?: Date; createdAt: Date; items: number;
  // Denormalized labels
  labels: UiLabel[];
}

export interface UiLabel {
  id: string; title: string; color: string; textColor: string;
}
```

## Data Flow

### Startup Flow

```
App.svelte onMount()
  ↓
backend.checkAuthAndInitAuthStore()
  ↓
backend.loadDataAndInitDataStore()
  ├─→ githubClient.queryGitHubProjects() → dataStore.github
  ├─→ databaseClient.columnRead() → dataStore.database.columns
  ├─→ databaseClient.projectRead() → dataStore.database.projects
  ├─→ databaseClient.labelRead() → dataStore.database.labels
  ├─→ databaseClient.projectLabelRelationRead() → dataStore.database.project_labels
  └─→ reconcileDatabaseProjects() (sync with GitHub reality)
  ↓
uiData (derived store) computes automatically
  ↓
UI renders
```

### User Action Flow (Optimistic Updates)

```
User Action (e.g., drag project to column)
  ↓
backend.moveProjectToColumn(projectId, columnId)
  ├─→ 1. Update dataStore immediately (optimistic)
  │      └─→ uiData recomputes → UI updates instantly
  └─→ 2. databaseClient.projectUpdateColumn() (async)
       ├─→ Success: Done
       └─→ Error: reloadDatabaseDataIntoDataStore() + throw
```

## State Transitions

### Project Lifecycle
```
New on GitHub → Unassigned column
  ↓ User drags
User column (e.g., "In Progress")
  ↓ Closed on GitHub
Closed column (automatic)
  ↓ Reopened on GitHub
Unassigned column
  ↓ Deleted on GitHub
Removed from app
```

### Column Lifecycle
```
Created by user → Active
  ↓ User reorders
New position (single column moved)
  ↓ User deletes
Deleted → Projects moved to Unassigned
```

### Label Lifecycle
```
Created → Active
  ↓ User assigns to projects
Project associations created
  ↓ User deletes label
All associations removed
```

## Validation Rules

- **Max 10 user columns** per user (enforced by business layer)
- **Unique column titles** per user (DB constraint)
- **Unique label titles** per user (DB constraint)
- **Closed projects** must be in Closed column (enforced by reconciliation)
- **System columns** (Unassigned, Closed) cannot be deleted or renamed

## Reconciliation Logic

On startup, `reconcileDatabaseProjects()` syncs database with GitHub reality:

1. **New projects:** Created GitHub projects → Added to Unassigned/Closed
2. **Deleted projects:** Removed from GitHub → Deleted from database
3. **Status changes:** Open→Closed → Moved to Closed column
4. **Status changes:** Closed→Open → Moved to Unassigned column

User customizations (column assignments, labels) are preserved for unchanged projects.

---

**Implementation Status:** Database schema deployed. Data store and UI data layers complete. Business operations partially complete (see plan.md).