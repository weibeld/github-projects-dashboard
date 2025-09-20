// Business layer types - Public API for application code
// Re-exports all types that application code should use

// Import all base types from centralized location
import type {
  ProjectID,
  Column,
  Label,
  Project,
  SortField,
  SortDirection,
  GitHubProject,
  UserInfo,
  AuthSession
} from '../base/types';
import {
  SORT_FIELD_LABELS,
  SORT_DIRECTION_LABELS,
  DEFAULT_SORT_FIELD,
  DEFAULT_SORT_DIRECTION
} from '../base/types';

// Re-export all types for application use
export type {
  // Base types
  ProjectID,

  // Database types
  Column,
  Label,
  Project,
  SortField,
  SortDirection,

  // GitHub types
  GitHubProject,

  // Auth types
  UserInfo,
  AuthSession
};

// Re-export constants for application use
export { SORT_FIELD_LABELS, SORT_DIRECTION_LABELS, DEFAULT_SORT_FIELD, DEFAULT_SORT_DIRECTION };