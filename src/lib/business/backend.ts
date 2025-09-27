// Business Layer Backend - All internal implementation
// Organized logically for developer productivity

import * as authClient from '../base/clients/auth';
import * as databaseClient from '../base/clients/database';
import * as githubClient from '../base/clients/github';
import { dataStoreInit, dataStoreClear, dataStoreGetColumns, dataStoreGetProjects, dataStoreSetColumns, dataStoreSetProjects, dataStoreSetLabels, dataStoreSetProjectLabels, dataStoreSetGitHub } from './dataStore';
import type { RawGitHub, RawProject, RawColumn } from '../base/types';
import { authStoreInit, authStoreClear, authStoreGetAuth } from './authStore';
import { DEFAULT_SORT_FIELD, DEFAULT_SORT_DIRECTION, SORT_FIELD_UPDATED_AT, SORT_FIELD_CLOSED_AT, SORT_DIRECTION_DESC, TITLE_UNASSIGNED_COLUMN, TITLE_CLOSED_COLUMN, COLUMN_TYPE_UNASSIGNED, COLUMN_TYPE_CLOSED, COLUMN_TYPE_USER } from './types';

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

// Only called at app startup if authenticated
export async function loadDataAndInitDataStore(): Promise<void> {
  // User is guaranteed to be authenticated (called only when $uiAuth is truthy)
  const auth = authStoreGetAuth()!;
  const userId = auth.githubUsername;

  // Load all data optimistically (no empty check)
  let [github, columns, projects, labels, projectLabels] = await Promise.all([
    githubClient.queryGitHubProjects(auth.githubToken),
    databaseClient.columnRead(userId),
    databaseClient.projectRead(userId),
    databaseClient.labelRead(userId),
    databaseClient.projectLabelRelationRead(userId)
  ]);

  // Check if system columns not yet created (only on first time load)
  if (columns.length === 0) {
    await createSystemColumns();
    // Reload columns data with created system columns
    columns = await databaseClient.columnRead(userId);
  }

  // Reconcile projects in database with project state from GitHub
  projects = await reconcileDatabaseProjects(github, projects, columns);

  // Initialize data store with synced data
  dataStoreInit({ github, database: { columns, projects, labels, projectLabels }});
}

// Renamed and simplified - only creates system columns (called when database is empty)
async function createSystemColumns(): Promise<void> {
  const userId = authStoreGetAuth()!.githubUsername;
  const systemColumns: Omit<RawColumn, 'id'>[] = [
    {
      userId,
      title: TITLE_UNASSIGNED_COLUMN,
      position: 0,
      type: COLUMN_TYPE_UNASSIGNED,
      sortField: SORT_FIELD_UPDATED_AT,
      sortDirection: SORT_DIRECTION_DESC
    },
    {
      userId,
      title: TITLE_CLOSED_COLUMN,
      position: 1,
      type: COLUMN_TYPE_CLOSED,
      sortField: SORT_FIELD_CLOSED_AT,
      sortDirection: SORT_DIRECTION_DESC
    }
  ];

  await Promise.all(
    systemColumns.map(column => databaseClient.columnCreate(column))
  );
}

// Sync GitHub projects state to database:
// - Create new GitHub projects in database
// - Delete removed GitHub projects from database
// - Assign formerly open/now closed GitHub projects to closed column
// - Assign formerly closed/now open GitHub projects to unassigned column
// Returns a RawProject[] array matching the reconciled state in the database.
// Notes:
// - Data store can't be assumed to be initialised when this is called
// - No database access, if nothing to reconcile
async function reconcileDatabaseProjects(github: RawGitHub[], projects: RawProject[], columns: RawColumn[]): Promise<RawProject[]> {
  const userId = authStoreGetAuth()!.githubUsername;

  // Extract IDs of system columns
  const idUnassignedCol = columns.find(col => col.type === COLUMN_TYPE_UNASSIGNED)!.id;
  const idClosedCol = columns.find(col => col.type === COLUMN_TYPE_CLOSED)!.id;

  const githubProjectIds = new Set(github.map(p => p.id));
  const dbProjectIds = new Set(projects.map(p => p.id));

  // Create missing projects in appropriate columns
  const inGitHubButNotInDb = github.filter(p => !dbProjectIds.has(p.id));
  const dbCreate = inGitHubButNotInDb.map(ghProject =>
    databaseClient.projectCreate({
      id: ghProject.id,
      userId,
      columnId: ghProject.isClosed ? idClosedCol : idUnassignedCol
    })
  );

  // Delete superfluous projects
  const inDbButNotInGitHub = [...dbProjectIds].filter(id => !githubProjectIds.has(id));
  const dbDelete = inDbButNotInGitHub.map(projectId =>
    databaseClient.projectDelete(projectId, userId)
  );

  // Sync open/close state of existing projects
  const githubProjectsMap = new Map(github.map(p => [p.id, p]));
  const dbUpdateColumn = projects
    .filter(dbProject => githubProjectsMap.has(dbProject.id))
    .map(dbProject => {
      const ghProject = githubProjectsMap.get(dbProject.id)!;
      const shouldBeInClosed = ghProject.isClosed;
      const isInClosed = dbProject.columnId === idClosedCol;

      if (shouldBeInClosed && !isInClosed) {
        // Assign to closed column
        return databaseClient.projectUpdateColumn(dbProject.id, userId, idClosedCol);
      } else if (!shouldBeInClosed && isInClosed) {
        // Assign to unassigned column
        return databaseClient.projectUpdateColumn(dbProject.id, userId, idUnassignedCol);
      }
      return null;
    })
    .filter(Boolean);

  const dbAll = [...dbCreate, ...dbDelete, ...dbUpdateColumn];
  // Apply database operations in parallel and re-read projects from database
  if (dbAll.length > 0) {
    await Promise.all(dbAll);
    projects = await databaseClient.projectRead(userId);
  }
  return projects;
}

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

// Reload GitHub projects and reconcile with database
export async function reloadGitHubData(): Promise<void> {
  const github = await githubClient.queryGitHubProjects(authStoreGetAuth()!.githubToken);
  const projects = await reconcileDatabaseProjects(github, dataStoreGetProjects(), dataStoreGetColumns());
  dataStoreSetGitHub(github);
  dataStoreSetProjects(projects);
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
    type: COLUMN_TYPE_USER,
    sortField: DEFAULT_SORT_FIELD,
    sortDirection: DEFAULT_SORT_DIRECTION
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
      type: COLUMN_TYPE_USER,
      sortField: DEFAULT_SORT_FIELD,
      sortDirection: DEFAULT_SORT_DIRECTION
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

  if (column.type !== COLUMN_TYPE_USER) {
    throw new Error("Can't delete system columns");
  }

  // Find unassigned column for moving projects
  const unassignedColumn = allColumns.find(col => col.type === COLUMN_TYPE_UNASSIGNED);
  if (!unassignedColumn) throw new Error('Unassigned column not found');

  // 1. Move projects to unassigned column (optimistic update)
  const projectsToMove = allProjects.filter(p => p.columnId === columnId);
  const updatedProjects = allProjects.map(p =>
    p.columnId === columnId ? { ...p, columnId: unassignedColumn.id } : p
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
        databaseClient.projectUpdateColumn(p.id, userId, unassignedColumn.id)
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
