// Base layer types - Shared between base clients

// ===== PRIMITIVE TYPES =====
export type ProjectID = string;

// ===== AUTH TYPES =====
export interface UserInfo {
  id: string;
  userName: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface AuthSession {
  access_token: string;
  user: { id: string };
}

// ===== DATABASE TYPES =====
export type SortField = 'title' | 'number' | 'items' | 'updatedAt' | 'closedAt' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface Column {
  id: string;
  user_id: string;
  title: string;
  prev_column_id?: string | null;
  next_column_id?: string | null;
  is_system: boolean;
  sort_field?: SortField;
  sort_direction?: SortDirection;
  created_at?: string;
  updated_at?: string;
}

export interface Label {
  id: string;
  user_id: string;
  title: string;
  color: string;
  text_color?: 'white' | 'black';
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string; // GitHub project ID
  user_id: string;
  column_id: string;
  created_at?: string;
  updated_at?: string;
  labels?: Label[]; // Joined from project_labels
}

export interface ProjectLabel {
  project_id: string;
  label_id: string;
}

// ===== GITHUB TYPES =====
export type GitHubProject = {
  id: ProjectID;
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

// ===== CONSTANTS =====
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