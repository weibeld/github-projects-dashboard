// Unified Business Layer - Single source of truth for all business logic
import { get, writable, derived } from 'svelte/store';

// Base layer imports
import * as authClient from '../base/authClient';
import * as dbClient from '../base/databaseClient';
import * as githubClient from '../base/githubClient';

// Business types - re-export for application code
export * from './types';
import type { DatabaseClientColumn, DatabaseClientLabel, DatabaseClientProject, GitHubClientProject } from '../base/types';
import type { SortField, SortDirection, Column, Label } from './types';

// ===== AUTH BUSINESS LOGIC =====

// Auth state stores
export const isLoggedIn = writable(false);
export const isLoggingIn = writable(false);
export const isLoggingOut = writable(false);

// Auth business functions
export async function login(): Promise<void> {
  try {
    isLoggingIn.set(true);
    await authClient.login();

    // Update auth state (session available after OAuth redirect)
    isLoggedIn.set(true);
  } finally {
    isLoggingIn.set(false);
  }
}

export async function logout(): Promise<void> {
  try {
    isLoggingOut.set(true);
    await authClient.logout();

    // Clear auth state
    isLoggedIn.set(false);

    // Clear data stores
    columns.set([]);
    projects.set([]);
    labels.set([]);
  } finally {
    isLoggingOut.set(false);
  }
}

export async function initializeAuth(): Promise<void> {
  try {
    isLoggingIn.set(true);

    const session = await authClient.getSession();
    if (session) {
      isLoggedIn.set(true);
    }
  } finally {
    isLoggingIn.set(false);
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await authClient.getSession();
  return session?.user?.id || null;
}

// ===== DATA BUSINESS LOGIC =====

// Data stores - in-memory reactive state
export const columns = writable<DatabaseClientColumn[]>([]);
export const projects = writable<DatabaseClientProject[]>([]);
export const labels = writable<DatabaseClientLabel[]>([]);
export const githubProjects = writable<Record<string, GitHubClientProject>>({});


// Derived stores for data relationships
export const projectsWithLabels = derived(
  [projects, labels],
  ([$projects, _$labels]) => {
    // This will be enhanced with proper label joining logic
    return $projects.map(project => ({
      ...project,
      labels: [] // TODO: Join with actual labels
    }));
  }
);

// Data loading functions
export async function loadAllData(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  // Ensure system columns exist
  await dbClient.ensureSystemColumns(userId);

  // Load all data in parallel
  const [columnsData, projectsData, labelsData] = await Promise.all([
    dbClient.columnReadAll(userId),
    dbClient.projectReadAll(userId),
    dbClient.labelReadAll(userId)
  ]);

  // Update stores
  columns.set(columnsData);
  projects.set(projectsData);
  labels.set(labelsData);
}

// Load GitHub projects from API
export async function loadProjectsFromGitHub(): Promise<void> {
  const session = await authClient.getSession();
  if (!session) {
    throw new Error('No active session');
  }

  try {
    const projectsArray = await githubClient.queryGitHubProjects(session.access_token);

    // Convert array to Record for store
    const data: Record<string, GitHubClientProject> = {};
    for (const p of projectsArray) {
      data[p.id] = p;
    }
    githubProjects.set(data);
  } catch (error) {
    if (error instanceof Error && error.message === 'GITHUB_AUTH_EXPIRED') {
      // Handle expired GitHub token by logging out
      await logout();
    } else {
      throw error;
    }
  }
}

// ===== COLUMN BUSINESS LOGIC =====

export async function createColumn(title: string, afterColumnId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  if (!title.trim()) {
    throw new Error('Title is required');
  }

  await dbClient.columnCreate({
    user_id: userId,
    title: title.trim(),
    is_system: false,
    sort_field: 'updatedAt',
    sort_direction: 'desc'
  }, afterColumnId);

  // Refresh columns
  await refreshColumns();
}

export async function deleteColumn(column: Column): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  // Move all projects to "No Status" column first
  const allProjects = get(projects);
  const projectsToMove = allProjects.filter(p => p.column_id === column.id);

  if (projectsToMove.length > 0) {
    const allColumns = get(columns);
    const noStatusColumn = allColumns.find(col => col.title === 'No Status');
    if (!noStatusColumn) {
      throw new Error('No Status column not found');
    }

    await dbClient.projectUpdateColumnMultiple(
      projectsToMove.map(p => p.id),
      userId,
      noStatusColumn.id
    );
  }

  // Delete the column
  await dbClient.columnDelete(column.id, userId);

  // Refresh data
  await refreshColumns();
  await refreshProjects();
}

export async function updateColumnTitle(columnId: string, title: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  if (!title.trim()) {
    throw new Error('Title is required');
  }

  await dbClient.columnUpdateTitle(columnId, userId, title.trim());
  await refreshColumns();
}

export async function moveColumnLeft(column: Column): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  if (column.is_system) {
    throw new Error("Can't move system columns");
  }

  // Check if we're trying to move before "No Status"
  const allColumns = get(columns);
  const currentIndex = allColumns.findIndex(s => s.id === column.id);
  const prevColumn = allColumns[currentIndex - 1];
  if (prevColumn?.title === 'No Status') {
    throw new Error("Can't move before No Status");
  }

  await dbClient.columnSwapLeft(column.id, userId);
  await refreshColumns();
}

export async function moveColumnRight(column: Column): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  if (column.is_system) {
    throw new Error("Can't move system columns");
  }

  // Check if we're trying to move past "Closed"
  const allColumns = get(columns);
  const currentIndex = allColumns.findIndex(s => s.id === column.id);
  const nextColumn = allColumns[currentIndex + 1];
  if (nextColumn?.title === 'Closed') {
    throw new Error("Can't move past Closed");
  }

  await dbClient.columnSwapRight(column.id, userId);
  await refreshColumns();
}

export async function updateColumnSortField(columnId: string, sortField: SortField): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  // Optimistic update
  columns.update(cols => cols.map(col =>
    col.id === columnId ? { ...col, sort_field: sortField } : col
  ));

  try {
    await dbClient.columnUpdateSortField(columnId, userId, sortField);
  } catch (err) {
    // Revert on error
    await refreshColumns();
    throw err;
  }
}

export async function updateColumnSortDirection(columnId: string, sortDirection: SortDirection): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  // Optimistic update
  columns.update(cols => cols.map(col =>
    col.id === columnId ? { ...col, sort_direction: sortDirection } : col
  ));

  try {
    await dbClient.columnUpdateSortDirection(columnId, userId, sortDirection);
  } catch (err) {
    // Revert on error
    await refreshColumns();
    throw err;
  }
}

// ===== LABEL BUSINESS LOGIC =====

export async function createLabel(title: string, color: string, textColor: 'white' | 'black' = 'white'): Promise<Label> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  if (!title.trim()) {
    throw new Error('Title is required');
  }

  const newLabel = await dbClient.labelCreate({
    user_id: userId,
    title: title.trim(),
    color: color,
    text_color: textColor
  });

  await refreshLabels();
  return newLabel;
}

export async function deleteLabel(labelId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  await dbClient.labelDelete(labelId, userId);

  // Refresh data
  await refreshLabels();
  await refreshProjects();
}

export async function addLabelToProject(projectId: string, labelId: string): Promise<void> {
  await dbClient.addLabelToProject(projectId, labelId);
  await refreshProjects();
}

export async function removeLabelFromProject(projectId: string, labelId: string): Promise<void> {
  await dbClient.removeLabelFromProject(projectId, labelId);
  await refreshProjects();
}

// ===== PROJECT BUSINESS LOGIC =====

export async function moveProjectToColumn(projectId: string, columnId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  // Optimistic update
  projects.update(projs => projs.map(proj =>
    proj.id === projectId ? { ...proj, column_id: columnId } : proj
  ));

  try {
    await dbClient.projectUpdateColumn(projectId, userId, columnId);
  } catch (err) {
    // Revert on error
    await refreshProjects();
    throw err;
  }
}

/**
 * Sort projects based on column sorting preferences
 */
export function sortProjects(projects: DatabaseClientProject[], githubProjects: Record<string, GitHubClientProject>, column: DatabaseClientColumn): DatabaseClientProject[] {
  if (!projects || projects.length === 0) return projects;

  // Context-aware sort field validation and defaults
  let sortField = column.sort_field || 'updatedAt';
  const sortDirection = column.sort_direction || 'desc';

  return [...projects].sort((a, b) => {
    const githubA = githubProjects[a.id];
    const githubB = githubProjects[b.id];

    let valueA: any;
    let valueB: any;

    switch (sortField) {
      case 'title':
        valueA = githubA?.title?.toLowerCase() || '';
        valueB = githubB?.title?.toLowerCase() || '';
        break;
      case 'number':
        valueA = githubA?.number || 0;
        valueB = githubB?.number || 0;
        break;
      case 'items':
        valueA = githubA?.items || 0;
        valueB = githubB?.items || 0;
        break;
      case 'updatedAt':
        valueA = githubA?.updatedAt?.getTime() || 0;
        valueB = githubB?.updatedAt?.getTime() || 0;
        break;
      case 'closedAt':
        valueA = githubA?.closedAt?.getTime() || 0;
        valueB = githubB?.closedAt?.getTime() || 0;
        break;
      case 'createdAt':
        valueA = githubA?.createdAt?.getTime() || 0;
        valueB = githubB?.createdAt?.getTime() || 0;
        break;
      default:
        return 0;
    }

    // Handle string comparison
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      const comparison = valueA.localeCompare(valueB);
      return sortDirection === 'asc' ? comparison : -comparison;
    }

    // Handle numeric comparison
    if (sortDirection === 'asc') {
      return valueA - valueB;
    } else {
      return valueB - valueA;
    }
  });
}

/**
 * Sync GitHub projects with database
 * TODO: Implement proper database client calls instead of direct supabase access
 */
export async function syncProjects(_githubProjects: GitHubClientProject[]): Promise<void> {
  // TODO: Implement this function using only database client functions
  // This will be implemented when we build out the complete business logic
  throw new Error('syncProjects not yet implemented - will be done during business logic implementation');
}

// ===== HELPER FUNCTIONS =====

// Column movement helpers
export function canMoveLeft(column: DatabaseClientColumn, columns: DatabaseClientColumn[]): boolean {
  if (column.is_system || !columns || columns.length === 0) return false;
  const currentIndex = columns.findIndex(s => s.id === column.id);
  const noStatusColumnIndex = columns.findIndex(s => s.title === 'No Status');
  return currentIndex > noStatusColumnIndex + 1;
}

export function canMoveRight(column: DatabaseClientColumn, columns: DatabaseClientColumn[]): boolean {
  if (column.is_system || !columns || columns.length === 0) return false;
  const currentIndex = columns.findIndex(s => s.id === column.id);
  const closedColumnIndex = columns.findIndex(s => s.title === 'Closed');
  return currentIndex < closedColumnIndex - 1;
}

// Label filtering helpers
export function getFilteredLabels(projectId: string, projects: DatabaseClientProject[], labels: DatabaseClientLabel[], searchQuery: string = ''): DatabaseClientLabel[] {
  const projectLabelIds = new Set(projects.find(p => p.id === projectId)?.labels?.map(l => l.id) || []);
  let availableLabels = labels.filter(l => !projectLabelIds.has(l.id));

  if (searchQuery.trim()) {
    availableLabels = availableLabels.filter(l =>
      l.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return availableLabels;
}

export function getProjectCountForLabel(labelId: string, projects: DatabaseClientProject[]): number {
  return projects.filter(project =>
    project.labels && project.labels.some(label => label.id === labelId)
  ).length;
}

// Data refresh functions
async function refreshColumns(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const updatedColumns = await dbClient.columnReadAll(userId);
  columns.set([...updatedColumns]);
}

async function refreshProjects(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const updatedProjects = await dbClient.projectReadAll(userId);
  projects.set([...updatedProjects]);
}

async function refreshLabels(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const updatedLabels = await dbClient.labelReadAll(userId);
  labels.set([...updatedLabels]);
}