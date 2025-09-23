# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with TypeScript checking + Vite
- `npm run build` - Build production bundle with TypeScript checking
- `npm run typecheck` - Run TypeScript type checking only
- `npm run test` - Run E2E tests with TypeScript checking + Playwright
- `npm run test:ui` - Run E2E tests with Playwright UI
- `npm run test:headed` - Run E2E tests in headed mode
- `npm run test:debug` - Run E2E tests in debug mode
- `npm run test:chrome/firefox/safari` - Run tests in specific browsers

## Architecture Overview

This is a GitHub Projects Dashboard built with Svelte 5, TypeScript, and Tailwind CSS. The app uses a clean layered architecture with strict TypeScript checking and comprehensive E2E testing.

### Core Architecture

**Layered Architecture** (following clean architecture principles as defined in README.md):

**Base Layer** (`src/lib/base/`):
- **Auth Client** (`authClient.ts`) - Authentication with Supabase OAuth, clean 3-function interface: `login()`, `logout()`, `getSession()`
- **GitHub Client** (`githubClient.ts`) - GitHub GraphQL API integration for fetching projects
- **Database Client** (`databaseClient.ts`) - Database operations via Supabase for metadata storage
- **Mock System** (`mock/`) - Complete mock implementation for testing without external dependencies

**Business Layer** (`src/lib/business/`):
- Central orchestration point containing business logic and state management
- Uses Svelte stores pattern for reactive state
- Abstracts and shields base layer clients from the UI
- Single source of truth for application state

**Utils/Helpers** (`src/lib/utils/`):
- Utility functions for data processing, UI interactions, and formatting
- Supporting functions for the business layer

**Application UI** (`src/`, `src/components/`):
- **App.svelte** - Root component managing app initialization and mock setup
- **Svelte Components** - Reusable UI components in `src/components/`

### Authentication Flow

- Supabase OAuth with GitHub provider
- Session management through authClient in base layer
- Enhanced session object includes full user details
- Authentication state managed through business layer stores

### Key Components

**Root Application**:
- **App.svelte** - Initializes mock mode via `setupMockMode()`, manages main app flow

**Reusable Components** (`src/components/`):
- Modular UI components extracted from monolithic structure
- Clean separation between presentation and business logic

**UI Features**:
- Native HTML5 drag-and-drop implementation for project management
- GitHub-themed styling with Tailwind CSS

### Type System

**Base Layer Types** (`src/lib/base/types.ts`):
- `AuthClientSession` - Enhanced session with full user details
- Client-specific types for each external service

**Mock System Types** (`src/lib/base/mock/types.ts`):
- `MockData` interface for comprehensive mock data structure
- Type-safe mock data definitions

**Strict TypeScript Configuration**:
- All scripts include TypeScript compilation with `tsc &&` prefix
- Strict mode enabled with comprehensive error checking
- Compile-time validation for all code including tests

### Mock System

**Architecture**: Located in `src/lib/base/mock/`
- **`utils.ts`** - Mock mode detection (`isMockMode()`) and utilities
- **`index.ts`** - Mock data setup (`setupMockMode()`, `defineMockData()`)
- **`types.ts`** - Mock data type definitions

**Flow**:
1. Tests specify mock data via URL: `?mock-data=/path/to/test-data`
2. App calls `setupMockMode()` in `onMount()` which detects mock mode
3. Mock data file (TypeScript) is dynamically imported with compile-time validation
4. All base layer clients check `isMockMode()` and return mock data instead of real API calls

### Styling

Uses Tailwind CSS with extensive GitHub-themed color palette defined in `tailwind.config.cjs`. Colors are extracted from GitHub's actual UI for authentic theming.

## E2E Testing

**Framework**: Playwright with TypeScript integration

**Architecture**:
- Tests in `tests/suites/` with corresponding mock data files
- TypeScript mock data files with compile-time validation using `satisfies MockData`
- Each test suite specifies its own mock data file via URL parameter
- Automatic dev server startup via Playwright configuration

## TypeScript Integration

**Strict Configuration**:
- `tsconfig.json` with strict mode enabled
- All npm scripts include TypeScript checking before execution
- Local TypeScript installation (no global dependencies)

**Benefits**:
- Compile-time error detection prevents runtime issues
- Dead code detection and unused variable identification
- Type safety across all layers of the architecture

## Important Notes

- The app requires GitHub OAuth setup through Supabase
- Uses GitHub GraphQL API with specific scopes: `repo read:user read:project`
- Base path configured for GitHub Pages deployment: `/github-projects-dashboard/`
- All external dependencies are locally installed via npm
- Mock mode enables comprehensive testing without external API dependencies

## User Todo List Management

The user maintains a personal todo list at `tmp/todo` for tracking tasks and ideas during development sessions. When the user requests todo list operations, always:

1. **Show todo list**: Read and display contents of `tmp/todo`
2. **Add items**: Append new items to the list with bullets (-)
3. **Insert items**: Add items at specific positions in the list
4. **Edit items**: Modify existing items by replacing the text
5. **Mark as done**: Add [DONE] prefix or strikethrough to completed items
6. **Reset list**: Clear all items and reinitialize with empty list template

Always update the "Last updated" timestamp when modifying the file. The file format is:
```
# Todo List

## Items:

- Item 1
- Item 2
- [DONE] Completed item

---
Last updated: [timestamp]
```

## Spelling

Use British spelling (e.g. "Colour" instead of "Color") except in identifiers in the code (e.g. name variables 'color', not 'colour').

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
