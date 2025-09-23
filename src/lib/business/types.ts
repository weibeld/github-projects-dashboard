// Business layer types - Public API for application code
// Re-exports all types that application code should use

// Import all base client types
import type {
  DatabaseClientColumn,
  DatabaseClientLabel,
  DatabaseClientProject,
  GitHubClientProject
} from '../base/types';

// ===== BUSINESS DOMAIN TYPES =====

// Sort types - these are business logic concepts, not database concerns
export type SortField = 'title' | 'number' | 'items' | 'updatedAt' | 'closedAt' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

// Business domain types - these will be the interface for the application
// For now, they alias the client types, but can evolve independently
export type {
  // Database types (aliased from client types)
  DatabaseClientColumn as Column,
  DatabaseClientLabel as Label,
  DatabaseClientProject as Project,

  // GitHub types (aliased from client types)
  GitHubClientProject as GitHubProject,

};

// ===== BUSINESS CONSTANTS =====

export const SORT_FIELD_LABELS: Record<SortField, string> = {
  title: 'Title',
  number: 'Project ID',
  items: 'Items',
  updatedAt: 'Updated',
  closedAt: 'Closed',
  createdAt: 'Created'
};

export const SORT_DIRECTION_LABELS: Record<SortDirection, string> = {
  asc: 'Asc',
  desc: 'Desc'
};

export const DEFAULT_SORT_FIELD: SortField = 'updatedAt';
export const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';