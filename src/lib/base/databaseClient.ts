import { supabase } from './supabase';
import { isMockMode, mockDelay } from './mock/utils';
import type {
  DatabaseClientColumn,
  DatabaseClientLabel,
  DatabaseClientProject,
  DatabaseClientProjectLabel
} from './types';

// Mock data storage (internal to client)
let mockColumns: DatabaseClientColumn[] = [];
let mockProjects: DatabaseClientProject[] = [];
let mockLabels: DatabaseClientLabel[] = [];
let mockProjectLabels: DatabaseClientProjectLabel[] = [];

function generateMockId(): string {
  return crypto.randomUUID();
}

// Mock data setter (called by the mock component)
export function initializeMockData(data: {
  columns: DatabaseClientColumn[];
  projects: DatabaseClientProject[];
  labels: DatabaseClientLabel[];
  project_labels: DatabaseClientProjectLabel[];
}): void {
  mockColumns = [...data.columns];
  mockProjects = [...data.projects];
  mockLabels = [...data.labels];
  mockProjectLabels = [...data.project_labels];
}

// Re-export constants for convenience
// TODO: remove (type exports in types.ts)
export { SORT_FIELD_LABELS, SORT_DIRECTION_LABELS, DEFAULT_SORT_FIELD, DEFAULT_SORT_DIRECTION };


// HELPER FUNCTIONS

// Get current timestamp for mock data
// TODO: move to mockMode.ts (see other mock-mode related function)
function mockCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Mock linked-list helper: Insert column after specified column
function mockInsertColumnAfter(newColumn: Column, prevColumnId: string): void {
  const prevColumn = mockGetDatabaseData().columns.find(col => col.id === prevColumnId);
  if (prevColumn) {
    const nextColumn = mockColumns.find(col => col.id === prevColumn.next_column_id!);

    // Update links
    newColumn.prev_column_id = prevColumnId;
    newColumn.next_column_id = prevColumn.next_column_id;
    prevColumn.next_column_id = newColumn.id;

    if (nextColumn) {
      nextColumn.prev_column_id = newColumn.id;
    }
  }
}

// Mock linked-list helper: Remove column from linked list
function mockRemoveColumnFromList(columnId: string): void {
  const column = mockColumns.find(col => col.id === columnId);
  if (column) {
    const prevColumn = mockColumns.find(col => col.id === column.prev_column_id);
    const nextColumn = mockColumns.find(col => col.id === column.next_column_id);

    if (prevColumn) {
      prevColumn.next_column_id = column.next_column_id;
    }
    if (nextColumn) {
      nextColumn.prev_column_id = column.prev_column_id;
    }
  }
}

// Mock linked-list helper: Get columns in linked-list order
function mockGetColumnsInOrder(userId: string): DatabaseClientColumn[] {
  const orderedColumns: DatabaseClientColumn[] = [];
  let currentColumn = mockColumns.find(col => col.user_id === userId && !col.prev_column_id) || null;

  while (currentColumn) {
    orderedColumns.push(currentColumn);
    currentColumn = mockColumns.find(col => col.id === currentColumn!.next_column_id) || null;
  }

  return orderedColumns;
}

// Common function for updating text fields
async function updateTextField(
  table: 'columns' | 'labels',
  id: string,
  userId: string,
  field: string,
  value: string
): Promise<void> {
  if (isMockMode()) {
    await mockDelay();
    const collection = table === 'columns' ? mockColumns : mockLabels;
    const item = collection.find((item: any) => item.id === id && item.user_id === userId);
    if (item) {
      (item as any)[field] = value;
      item.updated_at = mockCurrentTimestamp();
    }
    return;
  }

  const { error } = await supabase
    .from(table)
    .update({
      [field]: value,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}


// COLUMN FUNCTIONS

// Create a new column after a specific column
export async function columnCreate(
  column: Omit<Column, 'id' | 'created_at' | 'updated_at'>,
  prevColumnId: string
): Promise<Column> {
  if (isMockMode()) {
    await mockDelay();

    const newColumn: Column = {
      ...column,
      id: generateMockId(),
      prev_column_id: prevColumnId,
      created_at: mockCurrentTimestamp(),
      updated_at: mockCurrentTimestamp()
    };

    // Handle linked list insertion in mock
    mockInsertColumnAfter(newColumn, prevColumnId);
    mockColumns.push(newColumn);
    return newColumn;
  }

  // Real implementation - database triggers handle linked list
  const { data, error } = await supabase
    .from('columns')
    .insert({
      ...column,
      prev_column_id: prevColumnId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Read all columns for a user in linked list order
export async function columnReadAll(userId: string): Promise<DatabaseClientColumn[]> {
  if (isMockMode()) {
    await mockDelay();
    // Get columns in linked list order
    return mockGetColumnsInOrder(userId);
  }

  // Real implementation - traverse linked list
  const { data, error } = await supabase
    .from('columns')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  if (!data) return [];

  // Order by linked list
  const orderedColumns: DatabaseClientColumn[] = [];
  let currentColumn = data.find(col => !col.prev_column_id);

  while (currentColumn) {
    orderedColumns.push(currentColumn);
    currentColumn = data.find(col => col.id === currentColumn!.next_column_id);
  }

  return orderedColumns;
}

// Read a specific column by ID
export async function columnReadById(columnId: string, userId: string): Promise<Column | null> {
  if (isMockMode()) {
    await mockDelay();
    return mockColumns.find(col => col.id === columnId && col.user_id === userId) || null;
  }

  const { data, error } = await supabase
    .from('columns')
    .select('*')
    .eq('id', columnId)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}

// Update column title
export async function columnUpdateTitle(columnId: string, userId: string, title: string): Promise<void> {
  await updateTextField('columns', columnId, userId, 'title', title);
}

// Update column sort field
export async function columnUpdateSortField(columnId: string, userId: string, sortField: string): Promise<void> {
  await updateTextField('columns', columnId, userId, 'sort_field', sortField);
}

// Update column sort direction
export async function columnUpdateSortDirection(columnId: string, userId: string, sortDirection: string): Promise<void> {
  await updateTextField('columns', columnId, userId, 'sort_direction', sortDirection);
}

// Swap column with the one to its left
export async function columnSwapLeft(columnId: string, userId: string): Promise<void> {
  if (isMockMode()) {
    await mockDelay();

    const columns = mockGetColumnsInOrder(userId);
    const currentIndex = columns.findIndex(col => col.id === columnId);

    if (currentIndex <= 0) {
      throw new Error("Cannot move column further left");
    }

    // Swap with previous column
    const currentColumn = columns[currentIndex];
    const prevColumn = columns[currentIndex - 1];

    // Update the linked list connections
    const prevPrevColumn = columns[currentIndex - 2] || null;
    const nextColumn = columns[currentIndex + 1] || null;

    // Update prevColumn
    prevColumn.prev_column_id = currentColumn.id;
    prevColumn.next_column_id = nextColumn?.id || null;

    // Update currentColumn
    currentColumn.prev_column_id = prevPrevColumn?.id || null;
    currentColumn.next_column_id = prevColumn.id;

    // Update neighboring columns
    if (prevPrevColumn) {
      prevPrevColumn.next_column_id = currentColumn.id;
    }
    if (nextColumn) {
      nextColumn.prev_column_id = prevColumn.id;
    }

    return;
  }

  // Real implementation - database triggers handle the complexity
  const { data: columns } = await supabase
    .from('columns')
    .select('*')
    .eq('user_id', userId);

  if (!columns) throw new Error('Failed to fetch columns');

  // Order by linked list
  const orderedColumns: DatabaseClientColumn[] = [];
  let currentColumn = columns.find(col => !col.prev_column_id);
  while (currentColumn) {
    orderedColumns.push(currentColumn);
    currentColumn = columns.find(col => col.id === currentColumn!.next_column_id);
  }

  const currentIndex = orderedColumns.findIndex(col => col.id === columnId);
  if (currentIndex <= 0) {
    throw new Error("Cannot move column further left");
  }

  const current = orderedColumns[currentIndex];
  const prev = orderedColumns[currentIndex - 1];
  const prevPrev = orderedColumns[currentIndex - 2] || null;
  const next = orderedColumns[currentIndex + 1] || null;

  // Update all affected columns in a transaction-like manner
  const updates = [];

  // Update current column
  updates.push(
    supabase
      .from('columns')
      .update({
        prev_column_id: prevPrev?.id || null,
        next_column_id: prev.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', current.id)
  );

  // Update previous column
  updates.push(
    supabase
      .from('columns')
      .update({
        prev_column_id: current.id,
        next_column_id: next?.id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', prev.id)
  );

  // Update prev-prev column if exists
  if (prevPrev) {
    updates.push(
      supabase
        .from('columns')
        .update({
          next_column_id: current.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', prevPrev.id)
    );
  }

  // Update next column if exists
  if (next) {
    updates.push(
      supabase
        .from('columns')
        .update({
          prev_column_id: prev.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', next.id)
    );
  }

  // Execute all updates
  const results = await Promise.all(updates);
  for (const result of results) {
    if (result.error) throw result.error;
  }
}

// Swap column with the one to its right
export async function columnSwapRight(columnId: string, userId: string): Promise<void> {
  if (isMockMode()) {
    await mockDelay();

    const columns = mockGetColumnsInOrder(userId);
    const currentIndex = columns.findIndex(col => col.id === columnId);

    if (currentIndex >= columns.length - 1) {
      throw new Error("Cannot move column further right");
    }

    // Swap with next column
    const currentColumn = columns[currentIndex];
    const nextColumn = columns[currentIndex + 1];

    // Update the linked list connections
    const prevColumn = columns[currentIndex - 1] || null;
    const nextNextColumn = columns[currentIndex + 2] || null;

    // Update currentColumn
    currentColumn.prev_column_id = nextColumn.id;
    currentColumn.next_column_id = nextNextColumn?.id || null;

    // Update nextColumn
    nextColumn.prev_column_id = prevColumn?.id || null;
    nextColumn.next_column_id = currentColumn.id;

    // Update neighboring columns
    if (prevColumn) {
      prevColumn.next_column_id = nextColumn.id;
    }
    if (nextNextColumn) {
      nextNextColumn.prev_column_id = currentColumn.id;
    }

    return;
  }

  // Real implementation - similar to columnSwapLeft but in reverse
  const { data: columns } = await supabase
    .from('columns')
    .select('*')
    .eq('user_id', userId);

  if (!columns) throw new Error('Failed to fetch columns');

  // Order by linked list
  const orderedColumns: DatabaseClientColumn[] = [];
  let currentColumn = columns.find(col => !col.prev_column_id);
  while (currentColumn) {
    orderedColumns.push(currentColumn);
    currentColumn = columns.find(col => col.id === currentColumn!.next_column_id);
  }

  const currentIndex = orderedColumns.findIndex(col => col.id === columnId);
  if (currentIndex >= orderedColumns.length - 1) {
    throw new Error("Cannot move column further right");
  }

  const current = orderedColumns[currentIndex];
  const next = orderedColumns[currentIndex + 1];
  const prev = orderedColumns[currentIndex - 1] || null;
  const nextNext = orderedColumns[currentIndex + 2] || null;

  // Update all affected columns
  const updates = [];

  // Update current column
  updates.push(
    supabase
      .from('columns')
      .update({
        prev_column_id: next.id,
        next_column_id: nextNext?.id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', current.id)
  );

  // Update next column
  updates.push(
    supabase
      .from('columns')
      .update({
        prev_column_id: prev?.id || null,
        next_column_id: current.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', next.id)
  );

  // Update previous column if exists
  if (prev) {
    updates.push(
      supabase
        .from('columns')
        .update({
          next_column_id: next.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', prev.id)
    );
  }

  // Update next-next column if exists
  if (nextNext) {
    updates.push(
      supabase
        .from('columns')
        .update({
          prev_column_id: current.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', nextNext.id)
    );
  }

  // Execute all updates
  const results = await Promise.all(updates);
  for (const result of results) {
    if (result.error) throw result.error;
  }
}

// Delete a column (database trigger handles projects check and linked list)
export async function columnDelete(columnId: string, userId: string): Promise<void> {
  if (isMockMode()) {
    await mockDelay();

    // Check if column has projects
    const hasProjects = mockProjects.some(proj => proj.column_id === columnId);
    if (hasProjects) {
      throw new Error('Cannot delete column that contains projects');
    }

    // Remove from linked list and delete
    mockRemoveColumnFromList(columnId);
    mockColumns = mockColumns.filter(col => col.id !== columnId);
    return;
  }

  // Real implementation - database trigger handles everything
  const { error } = await supabase
    .from('columns')
    .delete()
    .eq('id', columnId)
    .eq('user_id', userId);

  if (error) throw error;
}

// LABEL FUNCTIONS

// Create a new label
export async function labelCreate(label: Omit<Label, 'id' | 'created_at' | 'updated_at'>): Promise<Label> {
  if (isMockMode()) {
    await mockDelay();

    const newLabel: Label = {
      ...label,
      id: generateMockId(),
      created_at: mockCurrentTimestamp(),
      updated_at: mockCurrentTimestamp()
    };

    mockLabels.push(newLabel);
    return newLabel;
  }

  const { data, error } = await supabase
    .from('labels')
    .insert(label)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Read all labels for a user
export async function labelReadAll(userId: string): Promise<DatabaseClientLabel[]> {
  if (isMockMode()) {
    await mockDelay();
    return mockLabels.filter(label => label.user_id === userId);
  }

  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .eq('user_id', userId)
    .order('title');

  if (error) throw error;
  return data || [];
}

// Read a specific label by ID
export async function labelReadById(labelId: string, userId: string): Promise<Label | null> {
  if (isMockMode()) {
    await mockDelay();
    return mockLabels.find(label => label.id === labelId && label.user_id === userId) || null;
  }

  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .eq('id', labelId)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}

// Update label title
export async function labelUpdateTitle(labelId: string, userId: string, title: string): Promise<void> {
  await updateTextField('labels', labelId, userId, 'title', title);
}

// Update label color
export async function labelUpdateColor(labelId: string, userId: string, color: string): Promise<void> {
  await updateTextField('labels', labelId, userId, 'color', color);
}

// Update label text color
export async function labelUpdateTextColor(labelId: string, userId: string, textColor: 'white' | 'black'): Promise<void> {
  await updateTextField('labels', labelId, userId, 'text_color', textColor);
}

// Delete a label (cascade deletes project_labels automatically)
export async function labelDelete(labelId: string, userId: string): Promise<void> {
  if (isMockMode()) {
    await mockDelay();

    // Remove from project_labels (cascade delete)
    mockProjectLabels = mockProjectLabels.filter(pl => pl.label_id !== labelId);
    // Remove the label
    mockLabels = mockLabels.filter(label => label.id !== labelId);
    return;
  }

  // Real implementation - database cascade handles project_labels
  const { error } = await supabase
    .from('labels')
    .delete()
    .eq('id', labelId)
    .eq('user_id', userId);

  if (error) throw error;
}

// PROJECT FUNCTIONS

// Create a new project
export async function projectCreate(project: Omit<Project, 'created_at' | 'updated_at'>): Promise<Project> {
  if (isMockMode()) {
    await mockDelay();

    const newProject: Project = {
      ...project,
      created_at: mockCurrentTimestamp(),
      updated_at: mockCurrentTimestamp()
    };

    mockProjects.push(newProject);
    return newProject;
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Read all projects for a user
export async function projectReadAll(userId: string): Promise<DatabaseClientProject[]> {
  if (isMockMode()) {
    await mockDelay();
    return mockProjects.filter(project => project.user_id === userId);
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

// Read a specific project by ID
export async function projectReadById(projectId: string, userId: string): Promise<Project | null> {
  if (isMockMode()) {
    await mockDelay();
    return mockProjects.find(project => project.id === projectId && project.user_id === userId) || null;
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}

// Update project column
export async function projectUpdateColumn(projectId: string, userId: string, columnId: string): Promise<void> {
  if (isMockMode()) {
    await mockDelay();
    const project = mockProjects.find(proj => proj.id === projectId && proj.user_id === userId);
    if (project) {
      project.column_id = columnId;
      project.updated_at = mockCurrentTimestamp();
    }
    return;
  }

  const { error } = await supabase
    .from('projects')
    .update({
      column_id: columnId,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Update multiple projects to the same column (efficient bulk operation)
export async function projectUpdateColumnMultiple(projectIds: string[], userId: string, columnId: string): Promise<void> {
  if (projectIds.length === 0) return;

  if (isMockMode()) {
    await mockDelay();
    projectIds.forEach(id => {
      const project = mockProjects.find(p => p.id === id && p.user_id === userId);
      if (project) {
        project.column_id = columnId;
        project.updated_at = mockCurrentTimestamp();
      }
    });
    return;
  }

  const { error } = await supabase
    .from('projects')
    .update({
      column_id: columnId,
      updated_at: new Date().toISOString()
    })
    .in('id', projectIds)
    .eq('user_id', userId);

  if (error) throw error;
}

// Delete a project (cascade deletes project_labels automatically)
export async function projectDelete(projectId: string, userId: string): Promise<void> {
  if (isMockMode()) {
    await mockDelay();

    // Remove from project_labels (cascade delete)
    mockProjectLabels = mockProjectLabels.filter(pl => pl.project_id !== projectId);
    // Remove the project
    mockProjects = mockProjects.filter(project => project.id !== projectId);
    return;
  }

  // Real implementation - database cascade handles project_labels
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) throw error;
}

// PROJECT-LABEL RELATION FUNCTIONS

// Add label to project
export async function addLabelToProject(projectId: string, labelId: string): Promise<void> {
  if (isMockMode()) {
    await mockDelay();

    // Check if relation already exists
    const exists = mockProjectLabels.some(pl =>
      pl.project_id === projectId && pl.label_id === labelId
    );

    if (!exists) {
      mockProjectLabels.push({
        project_id: projectId,
        label_id: labelId
      });
    }
    return;
  }

  const { error } = await supabase
    .from('project_labels')
    .insert({
      project_id: projectId,
      label_id: labelId
    });

  // Ignore duplicate key errors
  if (error && !error.message.includes('duplicate')) throw error;
}

// Remove label from project
export async function removeLabelFromProject(projectId: string, labelId: string): Promise<void> {
  if (isMockMode()) {
    await mockDelay();
    mockProjectLabels = mockProjectLabels.filter(pl =>
      !(pl.project_id === projectId && pl.label_id === labelId)
    );
    return;
  }

  const { error } = await supabase
    .from('project_labels')
    .delete()
    .eq('project_id', projectId)
    .eq('label_id', labelId);

  if (error) throw error;
}

// Get labels for a project
export async function getLabelsForProject(projectId: string): Promise<DatabaseClientLabel[]> {
  if (isMockMode()) {
    await mockDelay();
    const labelIds = mockProjectLabels
      .filter(pl => pl.project_id === projectId)
      .map(pl => pl.label_id);

    return mockLabels.filter(label => labelIds.includes(label.id));
  }

  const { data, error } = await supabase
    .from('project_labels')
    .select('label:labels(*)')
    .eq('project_id', projectId);

  if (error) throw error;
  return (data || []).map((item: any) => item.label);
}

// Get projects for a label
export async function getProjectsForLabel(labelId: string, userId: string): Promise<DatabaseClientProject[]> {
  if (isMockMode()) {
    await mockDelay();
    const projectIds = mockProjectLabels
      .filter(pl => pl.label_id === labelId)
      .map(pl => pl.project_id);

    return mockProjects.filter(project =>
      projectIds.includes(project.id) && project.user_id === userId
    );
  }

  const { data, error } = await supabase
    .from('project_labels')
    .select('project:projects(*)')
    .eq('label_id', labelId)
    .eq('project.user_id', userId);

  if (error) throw error;
  return (data || []).map((item: any) => item.project);
}

// Ensure system columns exist for both real and mock modes
// TODO: move to business layer?
export async function ensureSystemColumns(userId: string): Promise<void> {

  if (isMockMode()) {
    await mockDelay();
    const hasNoStatus = mockColumns.some(col => col.title === 'No Status' && col.user_id === userId);
    const hasClosed = mockColumns.some(col => col.title === 'Closed' && col.user_id === userId);

    if (hasNoStatus && hasClosed) {
      return; // System columns already exist
    }

    // Create No Status column (first column, no previous)
    if (!hasNoStatus) {
      const noStatusColumn: Column = {
        id: 'col-no-status',
        user_id: userId,
        title: 'No Status',
        prev_column_id: null,
        next_column_id: null,
        is_system: true,
        sort_field: 'updatedAt',
        sort_direction: 'desc',
        created_at: mockCurrentTimestamp(),
        updated_at: mockCurrentTimestamp()
      };
      mockColumns.push(noStatusColumn);
    }

    // Create Closed column (after No Status)
    if (!hasClosed) {
      const noStatusColumn = mockColumns.find(col => col.title === 'No Status' && col.user_id === userId);
      const closedColumn: Column = {
        id: 'col-closed',
        user_id: userId,
        title: 'Closed',
        prev_column_id: noStatusColumn?.id || null,
        next_column_id: null,
        is_system: true,
        sort_field: 'closedAt',
        sort_direction: 'desc',
        created_at: mockCurrentTimestamp(),
        updated_at: mockCurrentTimestamp()
      };

      // Update No Status column to point to Closed
      if (noStatusColumn) {
        noStatusColumn.next_column_id = closedColumn.id;
      }
      mockColumns.push(closedColumn);
    }
    return;
  }

  // Check if system columns already exist
  const { data: existingSystemColumns } = await supabase
    .from('columns')
    .select('title, id')
    .eq('user_id', userId)
    .eq('is_system', true);

  const existingTitles = existingSystemColumns?.map(col => col.title) || [];
  let noStatusColumnId: string | null = null;

  // Create No Status column if it doesn't exist
  if (!existingTitles.includes('No Status')) {
    const { data, error } = await supabase
      .from('columns')
      .insert({
        user_id: userId,
        title: 'No Status',
        prev_column_id: null, // First column
        is_system: true,
        sort_field: 'updatedAt',
        sort_direction: 'desc'
      })
      .select()
      .single();

    if (error) throw error;
    noStatusColumnId = data.id;
  } else {
    noStatusColumnId = existingSystemColumns.find(col => col.title === 'No Status')?.id || null;
  }

  // Create Closed column if it doesn't exist
  if (!existingTitles.includes('Closed') && noStatusColumnId) {
    const { error } = await supabase
      .from('columns')
      .insert({
        user_id: userId,
        title: 'Closed',
        prev_column_id: noStatusColumnId, // After No Status
        is_system: true,
        sort_field: 'closedAt',
        sort_direction: 'desc'
      });

    if (error) throw error;
  }
}
