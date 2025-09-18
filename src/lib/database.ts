import { supabase } from './api/supabase';
import { get } from 'svelte/store';
import { githubUserInfo } from './auth';
import type { GitHubProject } from './api/github';

// Database types
export type SortField = 'title' | 'number' | 'items' | 'updatedAt' | 'closedAt' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

// Sort field configuration
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

export interface Column {
  id: string;
  user_id: string;
  title: string;
  position: number;
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
  position: number;
  created_at?: string;
  updated_at?: string;
  labels?: Label[]; // Joined from project_labels
}

// Get current user ID from auth
function getUserId(): string | null {
  const userInfo = get(githubUserInfo);
  return userInfo?.userName || null;
}

// Initialize default columns for a new user
export async function initializeUserColumns() {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  const { error } = await supabase.rpc('initialize_user_columns', {
    p_user_id: userId
  });

  if (error) throw error;
}

// Fetch all columns for the current user
export async function fetchColumns(): Promise<Column[]> {
  const userId = getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('columns')
    .select('*')
    .eq('user_id', userId)
    .order('position');

  if (error) throw error;
  return data || [];
}

// Update sorting preferences for a column
export async function updateColumnSorting(columnId: string, sortField: SortField, sortDirection: SortDirection): Promise<void> {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('columns')
    .update({
      sort_field: sortField,
      sort_direction: sortDirection,
      updated_at: new Date().toISOString()
    })
    .eq('id', columnId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Update column title
export async function updateColumnTitle(columnId: string, title: string): Promise<void> {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('columns')
    .update({
      title,
      updated_at: new Date().toISOString()
    })
    .eq('id', columnId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Sort projects based on column sorting preferences
export function sortProjects(projects: Project[], githubProjects: Record<string, GitHubProject>, column: Column): Project[] {
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

// Create a new column
export async function createColumn(title: string): Promise<Column> {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // Get all columns to find the "Closed" column position
  const { data: allColumns } = await supabase
    .from('columns')
    .select('id, title, position')
    .eq('user_id', userId)
    .order('position');

  if (!allColumns) throw new Error('Failed to fetch columns');

  // Find "Closed" column
  const closedColumn = allColumns.find(s => s.title === 'Closed');

  // If no "Closed" column exists, use max position + 1
  let newPosition: number;
  if (closedColumn) {
    // Insert new column before "Closed"
    newPosition = closedColumn.position;

    // Update "Closed" column to be last
    const { error: updateError } = await supabase
      .from('columns')
      .update({ position: closedColumn.position + 1 })
      .eq('id', closedColumn.id);

    if (updateError) throw updateError;
  } else {
    // Fallback: use max position + 1
    const maxPosition = Math.max(...allColumns.map(s => s.position), -1);
    newPosition = maxPosition + 1;
  }

  const { data, error } = await supabase
    .from('columns')
    .insert({
      user_id: userId,
      title,
      position: newPosition,
      is_system: false,
      sort_field: DEFAULT_SORT_FIELD,
      sort_direction: DEFAULT_SORT_DIRECTION
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Create a new column after a specific column
export async function createColumnAfter(title: string, afterColumnId: string): Promise<Column> {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // Get all columns to find positions
  const { data: allColumns } = await supabase
    .from('columns')
    .select('id, title, position')
    .eq('user_id', userId)
    .order('position');

  if (!allColumns) throw new Error('Failed to fetch columns');

  // Find the column to insert after
  const afterColumn = allColumns.find(s => s.id === afterColumnId);
  if (!afterColumn) throw new Error('Column to insert after not found');

  const newPosition = afterColumn.position + 1;

  // Update positions of all columns that come after the target position manually
  const columnsToUpdate = allColumns.filter(s => s.position >= newPosition);
  for (const column of columnsToUpdate) {
    const { error: individualUpdateError } = await supabase
      .from('columns')
      .update({ position: column.position + 1 })
      .eq('id', column.id);

    if (individualUpdateError) {
      console.error('Failed to update column position:', individualUpdateError);
      throw individualUpdateError;
    }
  }

  // Create the new column
  const { data, error } = await supabase
    .from('columns')
    .insert({
      user_id: userId,
      title,
      position: newPosition,
      is_system: false,
      sort_field: DEFAULT_SORT_FIELD,
      sort_direction: DEFAULT_SORT_DIRECTION
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a column (only non-system columns)
export async function deleteColumn(columnId: string) {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // Get the column to be deleted to find its position
  const { data: columnToDelete } = await supabase
    .from('columns')
    .select('position, is_system')
    .eq('id', columnId)
    .eq('user_id', userId)
    .single();

  if (!columnToDelete) {
    throw new Error('Column not found');
  }

  if (columnToDelete.is_system) {
    throw new Error('Cannot delete system column');
  }

  // First, move all projects from this column to "No Status"
  const { data: noStatusColumnData } = await supabase
    .from('columns')
    .select('id')
    .eq('user_id', userId)
    .eq('title', 'No Status')
    .single();

  if (!noStatusColumnData) {
    throw new Error('No Status column not found');
  }

  // Move projects to "No Status"
  const { error: updateError } = await supabase
    .from('projects')
    .update({ column_id: noStatusColumnData.id })
    .eq('column_id', columnId)
    .eq('user_id', userId);

  if (updateError) throw updateError;

  // Now delete the column
  const { error: deleteError } = await supabase
    .from('columns')
    .delete()
    .eq('id', columnId);

  if (deleteError) throw deleteError;

  // Shift all columns with higher positions down by 1 to compact gaps
  // Get all columns with higher positions
  const { data: columnsToUpdate } = await supabase
    .from('columns')
    .select('id, position')
    .eq('user_id', userId)
    .gt('position', columnToDelete.position)
    .order('position');

  if (columnsToUpdate && columnsToUpdate.length > 0) {
    // Update each column individually
    for (const column of columnsToUpdate) {
      const { error: individualUpdateError } = await supabase
        .from('columns')
        .update({ position: column.position - 1 })
        .eq('id', column.id);

      if (individualUpdateError) {
        console.error('Failed to update column position:', individualUpdateError);
        throw individualUpdateError;
      }
    }
  }
}

// Fetch all labels for the current user
export async function fetchLabels(): Promise<Label[]> {
  const userId = getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .eq('user_id', userId)
    .order('title');

  if (error) throw error;
  return data || [];
}

// Create a new label
export async function createLabel(title: string, color: string, textColor: 'white' | 'black' = 'white'): Promise<Label> {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('labels')
    .insert({
      user_id: userId,
      title,
      color,
      text_color: textColor
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a label
export async function deleteLabel(labelId: string) {
  const { error } = await supabase
    .from('labels')
    .delete()
    .eq('id', labelId);

  if (error) throw error;
}

// Fetch all projects for the current user with their labels
export async function fetchProjects(): Promise<Project[]> {
  const userId = getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      labels:project_labels(
        label:labels(*)
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;

  // Flatten the labels structure
  return (data || []).map(project => ({
    ...project,
    labels: project.labels?.map((pl: any) => pl.label) || []
  }));
}

// Sync GitHub projects with database
export async function syncProjects(githubProjects: GitHubProject[]) {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // Get or create column IDs
  const { data: columns } = await supabase
    .from('columns')
    .select('id, title')
    .eq('user_id', userId);

  if (!columns) throw new Error('No columns found');

  const noStatusColumnId = columns.find(s => s.title === 'No Status')?.id;
  const closedColumnId = columns.find(s => s.title === 'Closed')?.id;

  if (!noStatusColumnId || !closedColumnId) {
    throw new Error('Default columns not found. Run initializeUserColumns first.');
  }

  // Get existing projects
  const { data: existingProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId);

  const existingIds = new Set(existingProjects?.map(p => p.id) || []);

  // Prepare projects to upsert
  const projectsToUpsert = githubProjects.map(gp => ({
    id: gp.id,
    user_id: userId,
    column_id: existingIds.has(gp.id)
      ? undefined // Keep existing column if project already exists
      : gp.isClosed ? closedColumnId : noStatusColumnId,
    position: 0
  }));

  // Filter out undefined column_id for updates
  const newProjects = projectsToUpsert.filter(p => p.column_id !== undefined);

  if (newProjects.length > 0) {
    const { error } = await supabase
      .from('projects')
      .upsert(newProjects, {
        onConflict: 'id,user_id',
        ignoreDuplicates: true
      });

    if (error) throw error;
  }

  // Remove projects that no longer exist in GitHub
  const githubIds = new Set(githubProjects.map(p => p.id));
  const toDelete = Array.from(existingIds).filter(id => !githubIds.has(id));

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .in('id', toDelete)
      .eq('user_id', userId);

    if (error) throw error;
  }
}

// Update project column (for drag and drop)
export async function updateProjectColumn(projectId: string, columnId: string, position: number) {
  const { error } = await supabase
    .from('projects')
    .update({
      column_id: columnId,
      position,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId);

  if (error) throw error;
}

// Add label to project
export async function addProjectLabel(projectId: string, labelId: string) {
  const { error } = await supabase
    .from('project_labels')
    .insert({
      project_id: projectId,
      label_id: labelId
    });

  if (error && !error.message.includes('duplicate')) throw error;
}

// Remove label from project
export async function removeProjectLabel(projectId: string, labelId: string) {
  const { error } = await supabase
    .from('project_labels')
    .delete()
    .eq('project_id', projectId)
    .eq('label_id', labelId);

  if (error) throw error;
}

// Update multiple column positions (for column reordering)
export async function updateColumnPositions(columnPositions: Array<{id: string, position: number}>): Promise<void> {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // Update each column position
  for (const columnPos of columnPositions) {
    const { error } = await supabase
      .from('columns')
      .update({
        position: columnPos.position,
        updated_at: new Date().toISOString()
      })
      .eq('id', columnPos.id)
      .eq('user_id', userId);

    if (error) throw error;
  }
}