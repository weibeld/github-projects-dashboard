# GitHub Projects Dashboard

A powerful dashboard for managing and searching your GitHub Projects with advanced filtering capabilities.

## Key Features

### 🔍 Advanced Search & Filtering

Search and filter your GitHub Projects using a powerful Lucene-style query syntax:

- **Simple text search**: Just type a term like `Mem0` or `react` to find all projects mentioning it in titles or labels
- **Case-insensitive**: Searches work regardless of capitalisation (`mem0`, `Mem0`, `MEM0` all work the same)
- **Field-specific searches**: 
  - `title:frontend` - Search only in project titles
  - `label:bug` - Find projects with specific labels
  - `number:123` - Search by project number
- **Date filtering**: 
  - `updated:>1 week ago` - Projects updated recently
  - `created:<2025-01-01` - Projects created before a date
- **Numeric filtering**: 
  - `items:>5` - Projects with more than 5 items
- **Column filtering**: 
  - `column:todo` - Show/hide specific columns
- **Combined queries**: 
  - `label:bug updated:>1 month ago` - Multiple criteria at once

**Example**: To find all projects mentioning "Mem0", simply type `Mem0` in the search bar at the top of the dashboard.

### 📊 Project Management

- Drag-and-drop projects between columns
- Custom column creation and organisation
- Project labelling and categorisation
- Sort projects by various fields (title, number, items, dates)

## Architecture

The application follows a clean layered architecture with separation of concerns:

```
┌Architecture──────────────────────────────────────────────────────────────────┐
│                                                                              │
│   ┌───────────────────────────────────────────┐                              │
│   │                                           │                              │
│   │                     UI                    │                              │
│   │                                           │                              │
│   ├─────────────────────┐                     │                              │
│   │                     │                     │                              │
│   │    Utils/Helpers    │                     │                              │
│   │                     │                     │                              │
│   ├─────────────────────┴─────────────────────┤                              │
│   │                                           │                              │
│   │              Business Layer               │                              │
│   │                                           │                              │
│   ├─────────────┬┬─────────────┬┬─────────────┤ ─┐                           │
│   │             ││             ││             │  │                           │
│   │ Auth Client ││GitHub Client││  DB Client  │  │ Base Layer                │
│   │             ││             ││             │  │                           │
│   └─────┬─▲─────┘└─────┬─▲─────┘└─────┬─▲─────┘ ─┘                           │
│         │ │            │ │            │ │                                    │
│    .────▼─┴────.  .────▼─┴────.  .────▼─┴────.                               │
│   (Auth Provider)(   GitHub    )(  Database   )                              │
│    `───────────'  `───────────'  `───────────'                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key principles

- **Layered separation**: Clear boundaries between UI, business logic, and data access
- **Function-based API**: Business layer exports functions, not raw data structures
- **Mock support**: All clients support mock mode for testing and development
- **Single data core**: Centralised, controlled data access through business layer

### Base Layer

The base layer contains clients that connect to the external world, providing encapsulated and "dumb" interfaces:

- **Auth Client**: Handles authentication with OAuth providers (GitHub via Supabase)
- **GitHub Client**: Manages GitHub GraphQL API interactions for fetching projects and data
- **Database Client**: Provides CRUD operations for persistent metadata storage

Each client is designed to be:

- **Encapsulated**: Self-contained with clear interfaces
- **"Dumb"**: No business logic, pure data fetching/posting operations
- **Mock-enabled**: Can switch between real and mock implementations transparently

### Business Layer

The business layer contains the main business logic and serves as the central orchestration point:

- **Business logic container**: Houses all application rules, validation, and workflow logic
- **Client abstraction**: Completely shields and abstracts the base layer clients from the UI
- **Centralised data access**: Optimised for clean, controlled access to all data sources
- **UI interaction support**: Designed to efficiently implement required UI interactions
- **Single source of truth**: Maintains consistent state and data relationships across the application

## Functionality by Layer

This section outlines which layer provides each major piece of functionality:

### Base Layer

- **Authentication**: OAuth authentication with GitHub
- **GitHub API**: fetching of data from GitHub
- **Database**: Supabase database CRUD operations

### Business Layer

- **Data stores**: source-of-truth data in reactive data stores
- **UI data**: reactive denormalised data structures for UI display, base don data stores
- **Authentication cycle**: reactive data structure with authentication state and user information, lifecyle functions
- **Business operations**: create/edit/delete on columns, projects, labels

### UI Layer

- **Filtering**: dynamic filtering of displayed UI data

## Testing

The testing infrastructure uses Playwright for comprehensive end-to-end testing:

- **Test suites**: Organised test suites covering different application workflows
- **Mock data setup**: Tests define specific mock data scenarios for predictable testing
- **Full workflow coverage**: Tests simulate complete user journeys through the application
- **Isolated testing**: No dependency on external APIs or authentication providers

For testing, the architecture supports mock mode to enable comprehensive E2E testing without external dependencies:

```
┌Architecture with E2E-Tests───────────────────────────────────────────────────┐
│                                                                              │
│   ╔═══════════════════════════════════════════╗                              │
│   ║◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝║                              │
│   ║◝◝◝◝◝◝◝◝◝◝E2E Tests (Playwright)◝◝◝◝◝◝◝◝◝◝◝╠───┐                          │
│   ║◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝║   │                          │
│   ╚════════════════════╦═▲════════════════════╝   │                          │
│                        │ │ Run tests              │                          │
│   ┌────────────────────▼─┴────────────────────┐   │                          │
│   │                                           │   │                          │
│   │                     UI                    │   │                          │
│   │                                           │   │                          │
│   ├─────────────────────┐                     │   │                          │
│   │                     │                     │   │                          │
│   │    Utils/Helpers    │                     │   │                          │
│   │                     │                     │   │                          │
│   ├─────────────────────┴─────────────────────┤   │                          │
│   │                                           │   │                          │
│   │              Business Layer               │   │                          │
│   │                                           │   │                          │
│   ╠═══════════════════════════════════════════╣   │ Enable                   │
│   ║◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝Mock Mode◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝║◀──┤ mock mode                │
│   ╠═════════════╦╦═════════════╦╦═════════════╣   │                          │
│   ║◝◝◝◝◝◝◝◝◝◝◝◝◝║║◝◝◝◝◝◝◝◝◝◝◝◝◝║║◝◝◝◝◝◝◝◝◝◝◝◝◝║   │                          │
│   ║◝Auth Client◝║║GitHub Client║║◝◝DB Client◝◝║   │                          │
│   ║◝◝◝◝◝◝◝◝◝◝◝◝◝║║◝◝◝◝◝◝◝◝◝◝◝◝◝║║◝◝◝◝◝◝◝◝◝◝◝◝◝║   │                          │
│   ╠═════════════╣╠═════════════╣╠═════════════╣   │ Define                   │
│   ║◝◝Mock Auth◝◝║║◝Mock GitHub◝║║Mock Database║◀──┘ mock data                │
│   ╚═════════════╝╚═════════════╝╚═════════════╝                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Mock Mode Implementation

Mock mode uses a pull-based architecture where the app reads mock data at startup:

- **Activation**: Mock mode triggered by URL parameter specifying mock data file (`?mock-data=/path/to/file`)
- **Data loading**: App calls `setupMockMode()` in `onMount()` to detect mock mode and read specified mock data file
- **Client initialization**: `defineMockData()` processes mock data and initializes all base layer clients
- **Type-safe mock data**: Mock data files use TypeScript with `satisfies MockData` for compile-time validation
- **Adaptation layer**: `defineMockData()` handles partial mock data with defaults and transforms to client-specific formats
- **Transparent operation**: Business layer and UI work identically in both modes

## TypeScript Integration

The project uses strict TypeScript type checking for dev serving, building, and testing.

- **Strict mode enabled**: Maximum type safety with strict TypeScript configuration
- **Compile-time validation**: All scripts in `package.json` include TypeScript checking before execution
- **All-encompassing checking**: every type check checks all of the app code, test code, and config files

## Important Development Notes

### Database Schema and Database Client Types

- The database schema in `supabase-schema.sql` and the database client types in `src/lib/base/types.ts` must currently be **manually** kept in sync
- This synchronisation is currently **not** enforced at the code level: updating the database schema without also udpating the types in `src/lib/base/types.ts` might result in **hard-to-detect runtime errors** (due to the non-enforcement of exact type matches in TypeScript/JavaScript)
- To address this issue, a runtime validation system like [Zod](https://zod.dev/) could be put in place in future work
