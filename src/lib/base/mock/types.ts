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
} from '../types';

// Comprehensive mock data structure - all fields optional with sensible defaults
export interface MockData {
  auth?: {
    userName?: string;          // Default: 'mock-user'
    email?: string;             // Default: 'mock@example.com'
    avatarUrl?: string | null;  // Default: GitHub identicon URL
    id?: string;                // Default: 'mock-user'
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

