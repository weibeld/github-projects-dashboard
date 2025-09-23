// Base layer types - Shared between base clients

// ===== AUTH CLIENT TYPES =====
export interface AuthClientSession {
  access_token: string;
  user: {
    id: string;
    userName: string;
    avatarUrl?: string | null;
    email?: string | null;
  };
}

// ===== DATABASE CLIENT TYPES =====
export interface DatabaseClientColumn {
  id: string;
  user_id: string;
  title: string;
  prev_column_id?: string | null;
  next_column_id?: string | null;
  is_system: boolean;
  sort_field?: string;
  sort_direction?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseClientLabel {
  id: string;
  user_id: string;
  title: string;
  color: string;
  text_color?: 'white' | 'black';
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseClientProject {
  id: string; // GitHub project ID
  user_id: string;
  column_id: string;
  created_at?: string;
  updated_at?: string;
  labels?: DatabaseClientLabel[]; // Joined from project_labels
}

export interface DatabaseClientProjectLabel {
  project_id: string;
  label_id: string;
}

// ===== GITHUB CLIENT TYPES =====
export type GitHubClientProject = {
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

