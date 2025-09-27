// Business Layer Backend - All internal implementation
// Organized logically for developer productivity

import * as authClient from '../base/clients/auth';
import * as databaseClient from '../base/clients/database';
import * as githubClient from '../base/clients/github';
import { dataStoreInit, dataStoreClear, dataStoreGetColumns, dataStoreGetProjects, dataStoreSetColumns, dataStoreSetProjects, dataStoreSetLabels, dataStoreSetProjectLabels, dataStoreSetGitHub } from './dataStore';
import { authStoreInit, authStoreClear, authStoreGetAuth } from './authStore';

//==============================================================================
// AUTH OPERATIONS
//==============================================================================

export async function login(): Promise<void> {
  await authClient.login();
  // Causes reload, checkAuthAndInitAuthStore() initialises authStore on reload
}

export async function logout(): Promise<void> {
  await authClient.logout();
  authStoreClear();
  dataStoreClear();
}

// Only called at app startup
// Check if authenticated, and, if so, initialise authStore
export async function checkAuthAndInitAuthStore(): Promise<void> {
  const auth = await authClient.getSession();
  if (auth) {
    authStoreInit(auth);
  }
}

//==============================================================================
// DATA LOADING OPERATIONS
//==============================================================================

// Only called at app startup if authenticated
export async function loadDataAndInitDataStore(): Promise<void> {
  // User is guaranteed to be authenticated (called only when $uiAuth is truthy)
  const auth = authStoreGetAuth()!;
  const userId = auth.githubUsername;

  // Ensure system columns in database
  await ensureSystemColumns(userId);

  // Load all data in parallel (from database and GitHub API)
  const [github, columns, projects, labels, projectLabels] = await Promise.all([
    githubClient.queryGitHubProjects(auth.githubToken),
    databaseClient.columnRead(userId),
    databaseClient.projectRead(userId),
    databaseClient.labelRead(userId),
    databaseClient.projectLabelRelationRead(userId)
  ]);

  // Initialize data store with loaded data
  dataStoreInit({ github, database: { columns, projects, labels, projectLabels }});
}

async function ensureSystemColumns(userId: string): Promise<void> {
  const existingColumns = await databaseClient.columnRead(userId);

  const hasNoStatus = existingColumns.some(col => col.title === 'No Status');
  const hasClosed = existingColumns.some(col => col.title === 'Closed');

  if (hasNoStatus && hasClosed) {
    return; // System columns already exist
  }

  const nextPosition = existingColumns.length;

  // Create system columns
  if (!hasNoStatus) {
    await databaseClient.columnCreate({
      userId: userId,
      title: 'No Status',
      position: nextPosition,
      isSystem: true,
      sortField: 'updatedAt',
      sortDirection: 'desc'
    });
  }

  if (!hasClosed) {
    const finalPosition = hasNoStatus ? nextPosition + 1 : nextPosition;
    await databaseClient.columnCreate({
      userId: userId,
      title: 'Closed',
      position: finalPosition,
      isSystem: true,
      sortField: 'closedAt',
      sortDirection: 'desc'
    });
  }
}

//==============================================================================
// COLUMN OPERATIONS
//==============================================================================

export async function createColumn(title: string, afterColumnId: string): Promise<void> {
  const userId = authStoreGetAuth()!.githubUsername;

  if (!title.trim()) {
    throw new Error('Title is required');
  }

  const allColumns = dataStoreGetColumns();
  const afterColumn = allColumns.find(col => col.id === afterColumnId);
  if (!afterColumn) {
    throw new Error('Reference column not found');
  }

  const newPosition = afterColumn.position + 1;

  // 1. Calculate position shifts for existing columns
  const updatedColumns = allColumns.map(col =>
    col.position > afterColumn.position
      ? { ...col, position: col.position + 1 }
      : col
  );

  // 2. Optimistic cache update - add placeholder column
  const newColumn = {
    id: 'temp-' + Date.now(), // Temporary ID
    userId: userId,
    title: title.trim(),
    position: newPosition,
    isSystem: false,
    sortField: 'updatedAt',
    sortDirection: 'desc' as const
  };

  dataStoreSetColumns([...updatedColumns, newColumn]);

  try {
    // 3. Background database operations
    // Update positions for affected columns
    const positionUpdates = allColumns
      .filter(col => col.position > afterColumn.position)
      .map(col => databaseClient.columnUpdatePosition(col.id, userId, col.position + 1));

    await Promise.all(positionUpdates);

    // Then create new column
    const createdColumn = await databaseClient.columnCreate({
      userId: userId,
      title: title.trim(),
      position: newPosition,
      isSystem: false,
      sortField: 'updatedAt',
      sortDirection: 'desc'
    });

    // 4. Replace temporary column with real one
    const currentColumns = dataStoreGetColumns();
    const updatedColumns = currentColumns.map(col => col.id === newColumn.id ? createdColumn : col);
    dataStoreSetColumns(updatedColumns);

  } catch (error) {
    // 5. On error, revert data store and report error to caller (e.g. UI)
    await reloadDatabaseDataIntoDataStore();
    throw error;
  }
}

export async function deleteColumn(columnId: string): Promise<void> {
  const userId = authStoreGetAuth()!.githubUsername;

  const allColumns = dataStoreGetColumns();
  const allProjects = dataStoreGetProjects();

  const column = allColumns.find(col => col.id === columnId);
  if (!column) throw new Error('Column not found');

  if (column.isSystem) {
    throw new Error("Can't delete system columns");
  }

  // Find No Status column for moving projects
  const noStatusColumn = allColumns.find(col => col.title === 'No Status');
  if (!noStatusColumn) throw new Error('No Status column not found');

  // 1. Move projects to No Status (optimistic update)
  const projectsToMove = allProjects.filter(p => p.columnId === columnId);
  const updatedProjects = allProjects.map(p =>
    p.columnId === columnId ? { ...p, columnId: noStatusColumn.id } : p
  );

  // 2. Remove column and reorder positions (optimistic update)
  const updatedColumns = allColumns
    .filter(col => col.id !== columnId)
    .map(col => col.position > column.position ? { ...col, position: col.position - 1 } : col);

  // 3. Update cache immediately
  dataStoreSetProjects(updatedProjects);
  dataStoreSetColumns(updatedColumns);

  try {
    // 4. Background database operations
    const operations = [
      // Move projects (now single operations)
      ...projectsToMove.map(p =>
        databaseClient.projectUpdateColumn(p.id, userId, noStatusColumn.id)
      ),
      // Delete column (no position parameter needed)
      databaseClient.columnDelete(columnId, userId),
      // Update column positions (now handled in business layer)
      ...updatedColumns
        .filter(col => col.position !== allColumns.find(orig => orig.id === col.id)?.position)
        .map(col => databaseClient.columnUpdatePosition(col.id, userId, col.position))
    ];

    await Promise.all(operations);

  } catch (error) {
    // 5. On error, revert data store and report error to caller (e.g. UI)
    await reloadDatabaseDataIntoDataStore();
    throw error;
  }
}

//==============================================================================
// PROJECT OPERATIONS
//==============================================================================

export async function moveProjectToColumn(projectId: string, columnId: string): Promise<void> {
  const userId = authStoreGetAuth()!.githubUsername;

  // 1. Optimistic cache update
  const currentProjects = dataStoreGetProjects();
  const updatedProjects = currentProjects.map(p => p.id === projectId ? { ...p, columnId } : p);
  dataStoreSetProjects(updatedProjects);

  try {
    // 2. Background database update
    await databaseClient.projectUpdateColumn(projectId, userId, columnId);
  } catch (error) {
    // 3. On error, revert data store and report error to caller (e.g. UI)
    await reloadDatabaseDataIntoDataStore();
    throw error;
  }
}

//==============================================================================
// HELPER FUNCTIONS - Cache refresh operations
//==============================================================================

// Reload all data from the database into the data store
// Used for reverting optimistic updates on the data store
async function reloadDatabaseDataIntoDataStore(): Promise<void> {
  const userId = authStoreGetAuth()!.githubUsername;
  const [columns, projects, labels, projectLabels] = await Promise.all([
    databaseClient.columnRead(userId),
    databaseClient.projectRead(userId),
    databaseClient.labelRead(userId),
    databaseClient.projectLabelRelationRead(userId)
  ]);
  dataStoreSetColumns(columns);
  dataStoreSetProjects(projects);
  dataStoreSetLabels(labels);
  dataStoreSetProjectLabels(projectLabels);
}

// Reload data from GitHub API into the data store
// Currently unused (could be used for "Reload GitHub data" button)
export async function reloadGitHubDataIntoDataStore(): Promise<void> {
  const data = await githubClient.queryGitHubProjects(authStoreGetAuth()!.githubToken);
  dataStoreSetGitHub(data);
}
