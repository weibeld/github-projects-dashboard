// Unified Business Layer - Single source of truth for all business logic
import { get, writable, derived } from 'svelte/store';

// Base layer imports
import * as authClient from '../../base/clients/auth';
import * as dbClient from '../../base/clients/database';
import * as githubClient from '../../base/clients/github';

// Business types - re-export for application code
export * from './types';
import type { RawColumn, RawLabel, RawProject, RawGitHub } from '../../base/types';
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
  return session?.githubUsername || null;
}

// ===== DATA BUSINESS LOGIC =====

// Data stores - in-memory reactive state
export const columns = writable<RawColumn[]>([]);
export const projects = writable<RawProject[]>([]);
export const labels = writable<RawLabel[]>([]);
export const githubProjects = writable<Record<string, RawGitHub>>({});


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

// System setup functions
export async function ensureSystemColumns(userId: string): Promise<void> {
  const existingColumns = await dbClient.columnRead(userId);

  const hasNoStatus = existingColumns.some(col => col.title === 'No Status');
  const hasClosed = existingColumns.some(col => col.title === 'Closed');

  if (hasNoStatus && hasClosed) {
    return; // System columns already exist
  }

  const nextPosition = existingColumns.length;

  // Create No Status column (first system column)
  if (!hasNoStatus) {
    await dbClient.columnCreate({
      userId: userId,
      title: 'No Status',
      position: nextPosition,
      isSystem: true,
      sortField: 'updatedAt',
      sortDirection: 'desc'
    });
  }

  // Create Closed column (second system column)
  if (!hasClosed) {
    const finalPosition = hasNoStatus ? nextPosition + 1 : nextPosition;
    await dbClient.columnCreate({
      userId: userId,
      title: 'Closed',
      position: finalPosition,
      isSystem: true,
      sortField: 'closedAt',
      sortDirection: 'desc'
    });
  }
}

// Data loading functions
export async function loadAllData(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  // Ensure system columns exist
  await ensureSystemColumns(userId);

  // Load all data in parallel
  const [columnsData, projectsData, labelsData] = await Promise.all([
    dbClient.columnRead(userId),
    dbClient.projectRead(userId),
    dbClient.labelRead(userId)
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
    const projectsArray = await githubClient.queryGitHubProjects(session.githubToken);

    // Convert array to Record for store
    const data: Record<string, RawGitHub> = {};
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

  // Find position of the column we're inserting after - use in-memory data
  const allColumns = get(columns);
  const afterColumn = allColumns.find(col => col.id === afterColumnId);
  if (!afterColumn) {
    throw new Error('Reference column not found');
  }

  const newPosition = afterColumn.position + 1;

  await dbClient.columnCreate({
    userId: userId,
    title: title.trim(),
    position: newPosition,
    isSystem: false,
    sortField: 'updatedAt',
    sortDirection: 'desc'
  });

  // Refresh columns
  await refreshColumns();
}

export async function deleteColumn(column: Column): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  // Move all projects to "No Status" column first
  const allProjects = get(projects);
  const projectsToMove = allProjects.filter(p => p.columnId === column.id);

  if (projectsToMove.length > 0) {
    const allColumns = get(columns);
    const noStatusColumn = allColumns.find(col => col.title === 'No Status');
    if (!noStatusColumn) {
      throw new Error('No Status column not found');
    }

    // Move projects individually (database client now handles single projects only)
    await Promise.all(projectsToMove.map(p =>
      dbClient.projectUpdateColumn(p.id, userId, noStatusColumn.id)
    ));
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

  if (column.isSystem) {
    throw new Error("Can't move system columns");
  }

  if (column.position <= 1) {
    throw new Error("Can't move before No Status");
  }

  const newPosition = column.position - 1;
  await dbClient.columnUpdatePosition(column.id, userId, newPosition);
  await refreshColumns();
}

export async function moveColumnRight(column: Column): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  if (column.isSystem) {
    throw new Error("Can't move system columns");
  }

  // Get all columns to check max position
  const allColumns = get(columns);
  const maxNonSystemPosition = Math.max(
    ...allColumns.filter(col => !col.isSystem).map(col => col.position)
  );

  if (column.position >= maxNonSystemPosition) {
    throw new Error("Can't move past Closed");
  }

  const newPosition = column.position + 1;
  await dbClient.columnUpdatePosition(column.id, userId, newPosition);
  await refreshColumns();
}

export async function updateColumnSortField(columnId: string, sortField: SortField): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  // Optimistic update
  columns.update(cols => cols.map(col =>
    col.id === columnId ? { ...col, sortField: sortField } : col
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
    col.id === columnId ? { ...col, sortDirection: sortDirection } : col
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
    userId: userId,
    title: title.trim(),
    color: color,
    textColor: textColor
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
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  await dbClient.projectLabelRelationCreate({ projectId, labelId, userId });
  await refreshProjects();
}

export async function removeLabelFromProject(projectId: string, labelId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  await dbClient.projectLabelRelationDelete(projectId, labelId, userId);
  await refreshProjects();
}

// ===== PROJECT BUSINESS LOGIC =====

export async function moveProjectToColumn(projectId: string, columnId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  // Optimistic update
  projects.update(projs => projs.map(proj =>
    proj.id === projectId ? { ...proj, columnId: columnId } : proj
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
export function sortProjects(projects: RawProject[], githubProjects: Record<string, RawGitHub>, column: RawColumn): RawProject[] {
  if (!projects || projects.length === 0) return projects;

  // Context-aware sort field validation and defaults
  let sortField = column.sortField || 'updatedAt';
  const sortDirection = column.sortDirection || 'desc';

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
export async function syncProjects(_githubProjects: RawGitHub[]): Promise<void> {
  // TODO: Implement this function using only database client functions
  // This will be implemented when we build out the complete business logic
  throw new Error('syncProjects not yet implemented - will be done during business logic implementation');
}

// ===== HELPER FUNCTIONS =====

// Column movement helpers
export function canMoveLeft(column: RawColumn, columns: RawColumn[]): boolean {
  if (column.isSystem || !columns || columns.length === 0) return false;
  const currentIndex = columns.findIndex(s => s.id === column.id);
  const noStatusColumnIndex = columns.findIndex(s => s.title === 'No Status');
  return currentIndex > noStatusColumnIndex + 1;
}

export function canMoveRight(column: RawColumn, columns: RawColumn[]): boolean {
  if (column.isSystem || !columns || columns.length === 0) return false;
  const currentIndex = columns.findIndex(s => s.id === column.id);
  const closedColumnIndex = columns.findIndex(s => s.title === 'Closed');
  return currentIndex < closedColumnIndex - 1;
}

// Label filtering helpers
export async function getFilteredLabels(_projectId: string, labels: RawLabel[], searchQuery: string = ''): Promise<RawLabel[]> {
  // TODO: Implement using in-memory project-label relations
  // For now, return all labels filtered by search query
  let availableLabels = [...labels];

  if (searchQuery.trim()) {
    availableLabels = availableLabels.filter(l =>
      l.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return availableLabels;
}

export async function getProjectCountForLabel(_labelId: string, _userId: string): Promise<number> {
  // TODO: Implement using in-memory project-label relations
  // For now, return 0
  return 0;
}

// Data refresh functions
async function refreshColumns(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const updatedColumns = await dbClient.columnRead(userId);
  columns.set([...updatedColumns]);
}

async function refreshProjects(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const updatedProjects = await dbClient.projectRead(userId);
  projects.set([...updatedProjects]);
}

async function refreshLabels(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const updatedLabels = await dbClient.labelRead(userId);
  labels.set([...updatedLabels]);
}