# End-to-End Testing

End-to-end test setup with [Playwright](https://playwright.dev/) for the main business logic.

## Overview

The testing setup provides:

- **Test mode:** a mode that bypasses authentication and uses mock data
- **Authentication bypass:** tests start from a mocked authenticated state and focus on the business logic
- **Mock data:** simple test data mocking the data in the Supabase database as well as the data coming from the GitHub API
- **Isolated environment:** tests are run on an instance running on port 5174 (independently of the dev server, which uses port 5173)

Test mode is activated by appending `?test=true` to the URL. For example:

> <http://localhost:5174/github-projects-dashboard/?test=true>

## Files

- **`helpers.ts`:** test utilities (test mode and mock database operations)
- **`suites/`:** directory containing test suites and their mock data
  - **`<suite>.spec.ts`:** a test suite defining a set of related tests
  - **`<suite>.json`:** the mock data for the similarly named test suite

## Mock Data

The mock data contains the following data structures:

- **`userInfo`:** user information
- **`columns`:** mock columns (as saved in database)
- **`projects`:** mock projects (as saved in database)
- **`labels`:** set of mock labels (as saved in database)
- **`project_labels`:** project ← label assignments (as saved in database)
- **`githubProjects`:** mock GitHub Projects data (from GitHub API)

## Usage

### Running Tests Locally

Tests can be run locally on demand as follows.

Run all tests:

```bash
npm run test
```

Run tests with visual feedback:

```bash
npm run test:headed     # Show tested app in browser
npm run test:ui         # Interactive UI with step-by-step control
npm run test:debug      # Debug mode with manual step advancement
```

Run a specific test file:

```bash
npm run test:file pretest.spec.ts
```

Run for specific browsers:

```bash
npm run test:chrome
npm run test:firefox
npm run test:safari
```

> While tests are running, you can also visit <http://localhost:5174/github-projects-dashboard/?test=true> to see the instance the tests are interacting with.

### CI/CD

The complete set of tests is automatically executed on every push to GitHub by GitHub Actions (defined in `.github/workflows/playwright.yml`).

> **Note:** currently the test and the build-and-deploy workflows are independent from each other. That is, even if the tests fail, the application is still deployed.

## Tests

The individual test cases are defined in `tests/suites/*.spec.ts` files.

## Decommissioning

To remove the test setup, delete the following:

1. This entire `tests/` directory
2. Test mode imports and logic from `src/App.svelte`
3. The `setTestModeGitHubProjects` function from `src/lib/api/github.ts`
4. Mock database imports and conditional logic from `src/lib/database.ts`
5. The GitHub Action `.github/workflows/playwright.yml`
6. Test-related configuration files (`playwright.config.ts` file)

The application will continue to work normally without the testing setup.

## Temporary Notes

## Test Scenarios

This document outlines the planned test scenarios for comprehensive coverage of the GitHub Projects Dashboard functionality.

### 1. Matching Data Tests
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

### 2. Synchronisation Test 1: New GitHub Projects
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

### 3. Synchronisation Test 2: Deleted GitHub Projects
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

### Implementation Plan

#### Test File Structure
```
tests/
├── smoke-tests.spec.ts                    # Basic functionality (current)
├── crud-operations.spec.ts                # Scenario 1: CRUD testing
├── interaction-tests.spec.ts              # Scenario 1: Reordering, sorting, labels
├── sync-github-added.spec.ts              # Scenario 2: New GitHub projects
└── sync-github-removed.spec.ts            # Scenario 3: Deleted GitHub projects
```

#### Mock Data Structure
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

#### Prerequisites
- Implement data synchronization logic in application
- Add test utilities for dynamic mock data loading
- Set up test helpers for CRUD operations
- Create test data scenarios for each synchronization case
