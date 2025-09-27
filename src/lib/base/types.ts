// Base layer types - Core data structures used throughout the application

// ===== Auth data types =====

export interface RawAuth {
  githubToken: string;
  githubUsername: string;
  githubAvatarUrl: string;
}

// ===== GitHub data types =====

export type RawGitHub = {
  id: string;
  number: number;
  title: string;
  url: string;
  isPublic: boolean;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  closedAt: Date | null;
  items: number;
};

// ===== Database data types =====
// CAUTION: must maintain 1-to-1 correspondance to database tables

// Convenience wrapper
export interface RawDatabase {
  columns: RawColumn[];
  projects: RawProject[];
  labels: RawLabel[];
  projectLabels: RawProjectLabel[];
}

export interface RawColumn {
  id: string;
  userId: string;
  title: string;
  position: number;
  isSystem: boolean;
  sortField: string;
  sortDirection: string;
}

export interface RawLabel {
  id: string;
  userId: string;
  title: string;
  color: string;
  textColor: string;
}

export interface RawProject {
  id: string; // GitHub Project ID from GitHub
  userId: string;
  columnId: string;
}

// Junction table
export interface RawProjectLabel {
  projectId: string;
  labelId: string;
  userId: string;
}
