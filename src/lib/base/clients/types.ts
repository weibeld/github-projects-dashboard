// Base layer types - Shared between base clients

// ===== AUTH CLIENT TYPES =====

export interface AuthClientSession {
  accessToken: string;
  userName: string;
  userAvatarUrl: string;
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

// ===== DATABASE CLIENT TYPES =====
// CAUTION: one-to-one correspondance to database tables

export interface DatabaseClientColumn {
  id: string;
  userId: string;
  title: string;
  position: number;
  isSystem: boolean;
  sortField: string;
  sortDirection: string;
}

export interface DatabaseClientLabel {
  id: string;
  userId: string;
  title: string;
  color: string;
  textColor: string;
}

export interface DatabaseClientProject {
  id: string; // GitHub project ID
  userId: string;
  columnId: string;
}

export interface DatabaseClientProjectLabel {
  projectId: string;
  labelId: string;
  userId: string;
}
