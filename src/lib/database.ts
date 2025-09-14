import { supabase } from './supabase';
import { get } from 'svelte/store';
import { githubUserInfo } from './auth';
import type { GitHubProject } from './github';

// Database types
export type SortField = 'title' | 'number' | 'items' | 'updated' | 'closed' | 'created';
export type SortDirection = 'asc' | 'desc';

export interface Status {
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
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string; // GitHub project ID
  user_id: string;
  status_id: string;
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

// Initialize default statuses for a new user
export async function initializeUserStatuses() {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  const { error } = await supabase.rpc('initialize_user_statuses', {
    p_user_id: userId
  });

  if (error) throw error;
}

// Fetch all statuses for the current user
export async function fetchStatuses(): Promise<Status[]> {
  const userId = getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('statuses')
    .select('*')
    .eq('user_id', userId)
    .order('position');

  if (error) throw error;
  return data || [];
}

// Update sorting preferences for a status
export async function updateStatusSorting(statusId: string, sortField: SortField, sortDirection: SortDirection): Promise<void> {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('statuses')
    .update({
      sort_field: sortField,
      sort_direction: sortDirection,
      updated_at: new Date().toISOString()
    })
    .eq('id', statusId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Sort projects based on status sorting preferences
export function sortProjects(projects: Project[], githubProjects: Record<string, GitHubProject>, status: Status): Project[] {
  if (!projects || projects.length === 0) return projects;

  // Context-aware sort field validation and defaults
  let sortField = status.sort_field || 'number';
  const sortDirection = status.sort_direction || 'desc';

  // Validate sort field is appropriate for this column type
  if (status.title === 'Closed') {
    // For closed columns, if using 'updated', switch to 'closed'
    if (sortField === 'updated') {
      sortField = 'closed';
    }
  } else {
    // For non-closed columns, if using 'closed', switch to 'updated'
    if (sortField === 'closed') {
      sortField = 'updated';
    }
  }

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
      case 'updated':
        valueA = githubA?.updatedAt?.getTime() || 0;
        valueB = githubB?.updatedAt?.getTime() || 0;
        break;
      case 'closed':
        valueA = githubA?.closedAt?.getTime() || 0;
        valueB = githubB?.closedAt?.getTime() || 0;
        break;
      case 'created':
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

// Create a new status
export async function createStatus(title: string): Promise<Status> {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // Get all statuses to find the "Closed" status position
  const { data: allStatuses } = await supabase
    .from('statuses')
    .select('id, title, position')
    .eq('user_id', userId)
    .order('position');

  if (!allStatuses) throw new Error('Failed to fetch statuses');

  // Find "Closed" status
  const closedStatus = allStatuses.find(s => s.title === 'Closed');

  // If no "Closed" status exists, use max position + 1
  let newPosition: number;
  if (closedStatus) {
    // Insert new status before "Closed"
    newPosition = closedStatus.position;

    // Update "Closed" status to be last
    const { error: updateError } = await supabase
      .from('statuses')
      .update({ position: closedStatus.position + 1 })
      .eq('id', closedStatus.id);

    if (updateError) throw updateError;
  } else {
    // Fallback: use max position + 1
    const maxPosition = Math.max(...allStatuses.map(s => s.position), -1);
    newPosition = maxPosition + 1;
  }

  const { data, error } = await supabase
    .from('statuses')
    .insert({
      user_id: userId,
      title,
      position: newPosition,
      is_system: false,
      sort_field: 'number',
      sort_direction: 'desc'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a status (only non-system statuses)
export async function deleteStatus(statusId: string) {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // Get the status to be deleted to find its position
  const { data: statusToDelete } = await supabase
    .from('statuses')
    .select('position, is_system')
    .eq('id', statusId)
    .eq('user_id', userId)
    .single();

  if (!statusToDelete) {
    throw new Error('Status not found');
  }

  if (statusToDelete.is_system) {
    throw new Error('Cannot delete system status');
  }

  // First, move all projects from this status to "No Status"
  const { data: noStatusData } = await supabase
    .from('statuses')
    .select('id')
    .eq('user_id', userId)
    .eq('title', 'No Status')
    .single();

  if (!noStatusData) {
    throw new Error('No Status column not found');
  }

  // Move projects to "No Status"
  const { error: updateError } = await supabase
    .from('projects')
    .update({ status_id: noStatusData.id })
    .eq('status_id', statusId)
    .eq('user_id', userId);

  if (updateError) throw updateError;

  // Now delete the status
  const { error: deleteError } = await supabase
    .from('statuses')
    .delete()
    .eq('id', statusId);

  if (deleteError) throw deleteError;

  // Shift all statuses with higher positions down by 1 to compact gaps
  const { error: compactError } = await supabase
    .from('statuses')
    .update({ position: supabase.rpc('position - 1') })
    .eq('user_id', userId)
    .gt('position', statusToDelete.position);

  if (compactError) {
    // If the RPC approach doesn't work, fall back to manual approach
    console.warn('RPC position update failed, using manual approach:', compactError);

    // Get all statuses with higher positions
    const { data: statusesToUpdate } = await supabase
      .from('statuses')
      .select('id, position')
      .eq('user_id', userId)
      .gt('position', statusToDelete.position)
      .order('position');

    if (statusesToUpdate && statusesToUpdate.length > 0) {
      // Update each status individually
      for (const status of statusesToUpdate) {
        const { error: individualUpdateError } = await supabase
          .from('statuses')
          .update({ position: status.position - 1 })
          .eq('id', status.id);

        if (individualUpdateError) {
          console.error('Failed to update status position:', individualUpdateError);
        }
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
export async function createLabel(title: string, color: string): Promise<Label> {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('labels')
    .insert({
      user_id: userId,
      title,
      color
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

  // Get or create status IDs
  const { data: statuses } = await supabase
    .from('statuses')
    .select('id, title')
    .eq('user_id', userId);

  if (!statuses) throw new Error('No statuses found');

  const noStatusId = statuses.find(s => s.title === 'No Status')?.id;
  const closedId = statuses.find(s => s.title === 'Closed')?.id;

  if (!noStatusId || !closedId) {
    throw new Error('Default statuses not found. Run initializeUserStatuses first.');
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
    status_id: existingIds.has(gp.id)
      ? undefined // Keep existing status if project already exists
      : gp.isClosed ? closedId : noStatusId,
    position: 0
  }));

  // Filter out undefined status_id for updates
  const newProjects = projectsToUpsert.filter(p => p.status_id !== undefined);

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

// Update project status (for drag and drop)
export async function updateProjectStatus(projectId: string, statusId: string, position: number) {
  const { error } = await supabase
    .from('projects')
    .update({
      status_id: statusId,
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