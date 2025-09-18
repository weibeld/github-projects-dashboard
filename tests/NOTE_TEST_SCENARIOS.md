# Test Scenarios

This document outlines the planned test scenarios for comprehensive coverage of the GitHub Projects Dashboard functionality.

## 1. Matching Data Tests
**Purpose**: Test interactions and operations when GitHub and database data are synchronized

**Test Categories**:
- **CRUD Operations**:
  - Create, Read, Update, Delete columns
  - Create, Read, Update, Delete labels
- **Reordering**:
  - Drag and drop projects between columns
  - Reorder columns
  - Reorder projects within columns
- **Sorting**:
  - Sort projects by different fields (updatedAt, createdAt, closedAt, title)
  - Sort direction (ascending/descending)
- **Label Assignment**:
  - Assign labels to projects
  - Remove labels from projects
  - Bulk label operations

**Mock Data**: Use current synchronized mock data (database.json + github.json)

## 2. Synchronisation Test 1: New GitHub Projects
**Purpose**: Test handling of projects that exist in GitHub but not in the database

**Scenario**:
- GitHub has a new project (e.g., "proj-5") that doesn't exist in database
- System should detect and incorporate the new project into database
- New project should appear in the "No Status" column by default

**Test Implementation**:
- Mock data with GitHub containing proj-5, database missing proj-5
- Verify detection of new project
- Verify automatic addition to database
- Verify UI updates to show new project

## 3. Synchronisation Test 2: Deleted GitHub Projects
**Purpose**: Test handling of projects that exist in database but no longer exist in GitHub

**Scenario**:
- Database has a project (e.g., "proj-3") that no longer exists in GitHub
- System should detect orphaned project and remove from database
- Project should disappear from UI

**Test Implementation**:
- Mock data with database containing proj-3, GitHub missing proj-3
- Verify detection of orphaned project
- Verify automatic removal from database
- Verify UI updates to hide removed project

## Implementation Plan

### Test File Structure
```
tests/
├── smoke-tests.spec.ts                    # Basic functionality (current)
├── crud-operations.spec.ts                # Scenario 1: CRUD testing
├── interaction-tests.spec.ts              # Scenario 1: Reordering, sorting, labels
├── sync-github-added.spec.ts              # Scenario 2: New GitHub projects
└── sync-github-removed.spec.ts            # Scenario 3: Deleted GitHub projects
```

### Mock Data Structure
```
src/tests/mock-data/
├── database.json                          # Default synchronized data
├── github.json                           # Default synchronized data
└── sync-scenarios/
    ├── github-added/
    │   ├── database.json                  # Missing new project
    │   └── github.json                    # Contains new project
    └── github-removed/
        ├── database.json                  # Contains orphaned project
        └── github.json                    # Missing project
```

### Prerequisites
- Implement data synchronization logic in application
- Add test utilities for dynamic mock data loading
- Set up test helpers for CRUD operations
- Create test data scenarios for each synchronization case

---

*This document will be updated as test scenarios are implemented and refined.*