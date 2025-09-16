# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build

## Architecture Overview

This is a GitHub Projects Dashboard built with SvelteKit 5, TypeScript, and Tailwind CSS. The app connects to GitHub's API via Supabase OAuth to fetch and manage user's GitHub Projects in a Kanban-style interface.

### Core Architecture

**State Management**: Uses Svelte 5's runes and stores pattern with a centralized metadata store that manages:
- Projects with custom statuses and labels
- Views with column configurations and filtering
- Authentication state across page reloads

**Authentication Flow**: Supabase OAuth with GitHub provider, storing session state in localStorage for persistence across page reloads. Authentication states are managed through reactive stores (`isLoggedIn`, `isLoggingInInit`, `isLoggingInAfterOAuth`, `isLoggingOut`).

**Data Layer**:
- `src/lib/github.ts` - GitHub GraphQL API integration for fetching projects
- `src/lib/metadata.ts` - Complex metadata management with derived stores for projects, labels, statuses, and views
- `src/lib/auth.ts` - Authentication state management with persistent login state

### Key Components

- **App.svelte** - Root component managing authentication flow and main content rendering
- **MainContent.svelte** - Primary dashboard interface (loads after authentication)
- **Header.svelte** - Navigation and user controls
- **Column.svelte** - Kanban columns for different project statuses
- **ProjectCard.svelte** - Individual project display with drag-and-drop

### Type System

Central types are defined in `src/lib/commonTypes.ts`:
- `MetaProject`, `MetaStatus`, `MetaLabel`, `MetaView` for metadata entities
- `GitHubProject` for GitHub API data structure
- Metadata store combines all entities with complex relationships

### Styling

Uses Tailwind CSS with extensive GitHub-themed color palette defined in `tailwind.config.cjs`. Colors are extracted from GitHub's actual UI for authentic theming.

### Drag & Drop

Implements SortableJS for drag-and-drop functionality between project status columns.

## Important Notes

- The app requires GitHub OAuth setup through Supabase
- Uses GitHub GraphQL API with specific scopes: `repo read:user read:project`
- Base path configured for GitHub Pages deployment: `/github-projects-dashboard/`
- Metadata store functions include complex validation for unique titles and proper cross-entity relationships
- Store logging is implemented via `src/lib/log.ts` for debugging state changes

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
- Please marke the done items in the todo file too