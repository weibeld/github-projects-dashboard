import { supabase } from './supabase';
import { get } from 'svelte/store';
import { githubUserInfo } from './auth';
import type { GitHubProject } from './github';

// Database types
export interface Status {
  id: string;
  user_id: string;
  title: string;
  position: number;
  is_system: boolean;
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

// Create a new status
export async function createStatus(title: string): Promise<Status> {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // Get max position
  const { data: statuses } = await supabase
    .from('statuses')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1);

  const maxPosition = statuses?.[0]?.position ?? -1;

  const { data, error } = await supabase
    .from('statuses')
    .insert({
      user_id: userId,
      title,
      position: maxPosition + 1,
      is_system: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a status (only non-system statuses)
export async function deleteStatus(statusId: string) {
  const { error } = await supabase
    .from('statuses')
    .delete()
    .eq('id', statusId);

  if (error) throw error;
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