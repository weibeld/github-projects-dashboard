/**
 * Mock mode types for test suite data definition
 * Single comprehensive structure for all mock data with compile-time validation
 */

import type {
  GitHubClientProject,
  DatabaseClientColumn,
  DatabaseClientProject,
  DatabaseClientLabel,
  DatabaseClientProjectLabel
} from '../clients/types';

// Comprehensive mock data structure - all fields optional with sensible defaults
export interface MockData {
  auth?: {
    userName?: string;          // Default: 'mock-user'
    userAvatarUrl?: string;     // Default: GitHub identicon URL
  };
  github?: {
    projects?: GitHubClientProject[];  // Default: []
  };
  database?: {
    columns?: DatabaseClientColumn[];       // Default: []
    projects?: DatabaseClientProject[];    // Default: []
    labels?: DatabaseClientLabel[];        // Default: []
    project_labels?: DatabaseClientProjectLabel[];  // Default: []
  };
}

