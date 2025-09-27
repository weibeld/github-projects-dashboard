/**
 * Mock mode types for test suite data definition
 * Single comprehensive structure for all mock data with compile-time validation
 */

import type {
  RawGitHub,
  RawColumn,
  RawProject,
  RawLabel,
  RawProjectLabel
} from '../types';

// Comprehensive mock data structure - all fields optional with sensible defaults
export interface MockData {
  auth?: {
    githubUsername?: string;          // Default: 'mock-user'
    githubAvatarUrl?: string;     // Default: GitHub identicon URL
  };
  github?: {
    projects?: RawGitHub[];  // Default: []
  };
  database?: {
    columns?: RawColumn[];       // Default: []
    projects?: RawProject[];    // Default: []
    labels?: RawLabel[];        // Default: []
    project_labels?: RawProjectLabel[];  // Default: []
  };
}

