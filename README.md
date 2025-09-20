# GitHub Projects Dashboard

## Architecture

The application follows a clean layered architecture with separation of concerns:

```
┌Architecture──────────────────────────────────────────────────────────────────┐
│                                                                              │
│   ┌───────────────────────────────────────────┐                              │
│   │                                           │                              │
│   │             Application                   │                              │
│   │                                           │                              │
│   ├─────────────────────┐                     │                              │
│   │                     │                     │                              │
│   │    Utils/Helpers    │                     │                              │
│   │                     │                     │                              │
│   ├─────────────────────┴─────────────────────┤                              │
│   │                                           │ ─┐                           │
│   │              Business Layer               │  │Business Logic             │
│   │                                           │ ─┘                           │
│   ├─────────────┬┬─────────────┬┬─────────────┤                              │
│   │             ││             ││             │ ─┐                           │
│   │ Auth Client ││GitHub Client││  DB Client  │  │Base Layer (Auth/API/CRUD) │
│   │             ││             ││             │ ─┘                           │
│   └─────┬─▲─────┘└─────┬─▲─────┘└─────┬─▲─────┘                              │
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

#### Base Layer

The base layer contains clients that connect to the external world, providing encapsulated and "dumb" interfaces:

- **Auth Client**: Handles authentication with OAuth providers (GitHub via Supabase)
- **GitHub Client**: Manages GitHub GraphQL API interactions for fetching projects and data
- **Database Client**: Provides CRUD operations for persistent metadata storage

Each client is designed to be:

- **Encapsulated**: Self-contained with clear interfaces
- **"Dumb"**: No business logic, pure data fetching/posting operations
- **Mock-enabled**: Can switch between real and mock implementations transparently

#### Business Layer

The business layer contains the main business logic and serves as the central orchestration point:

- **Business logic container**: Houses all application rules, validation, and workflow logic
- **Client abstraction**: Completely shields and abstracts the base layer clients from the UI
- **Centralised data access**: Optimised for clean, controlled access to all data sources
- **UI interaction support**: Designed to efficiently implement required UI interactions
- **Single source of truth**: Maintains consistent state and data relationships across the application

### E2E Testing Support

For testing, the architecture supports mock mode to enable comprehensive E2E testing without external dependencies:

```
┌Architecture with E2E-Tests───────────────────────────────────────────────────┐
│                                                                              │
│   ╔═══════════════════════════════════════════╗                              │
│   ║◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝║                              │
│   ║◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝E2E Tests◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝╠───┐                          │
│   ║◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝║   │                          │
│   ╠═══════════════════════════════════════════╣   │                          │
│   │                                           │   │                          │
│   │             Application                   │   │                          │
│   │                                           │   │                          │
│   ├─────────────────────┐                     │   │                          │
│   │                     │                     │   │                          │
│   │    Utils/Helpers    │                     │   │                          │
│   │                     │                     │   │                          │
│   ├─────────────────────┴─────────────────────┤   │                          │
│   │                                           │   │                          │
│   │              Business Layer               │   │                          │
│   │                                           │   │                          │
│   ╠═══════════════════════════════════════════╣   │Enable                    │
│   ║◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝Mock Mode◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝◝║◀──┤mock mode                 │
│   ╠═════════════╦╦═════════════╦╦═════════════╣   │                          │
│   ║◝◝◝◝◝◝◝◝◝◝◝◝◝║║◝◝◝◝◝◝◝◝◝◝◝◝◝║║◝◝◝◝◝◝◝◝◝◝◝◝◝║   │                          │
│   ║◝Auth Client◝║║GitHub Client║║◝◝DB Client◝◝║   │                          │
│   ║◝◝◝◝◝◝◝◝◝◝◝◝◝║║◝◝◝◝◝◝◝◝◝◝◝◝◝║║◝◝◝◝◝◝◝◝◝◝◝◝◝║   │                          │
│   ╠═════════════╣╠═════════════╣╠═════════════╣   │Define                    │
│   ║◝◝Mock Auth◝◝║║◝Mock GitHub◝║║Mock Database║◀──┘mock data                 │
│   ╚═════════════╝╚═════════════╝╚═════════════╝                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Mock Mode Implementation

Mock mode is activated through a URL GET parameter, enabling seamless testing:

- **Activation**: Mock mode triggered by URL parameter (e.g., `?mock=true`)
- **Client switching**: All clients automatically switch to mock implementations
- **Mock data**: Defined and controlled by E2E test suites using Playwright
- **Application ignorance**: Rest of the application remains unaware of mock mode
- **Transparent operation**: Business layer and UI work identically in both modes

#### Playwright E2E Framework

The testing infrastructure uses Playwright for comprehensive end-to-end testing:

- **Test suites**: Organised test suites covering different application workflows
- **Mock data setup**: Tests define specific mock data scenarios for predictable testing
- **Full workflow coverage**: Tests simulate complete user journeys through the application
- **Isolated testing**: No dependency on external APIs or authentication providers

