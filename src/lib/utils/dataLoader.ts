import { initializeUserColumns, syncProjects, fetchColumns, fetchProjects, fetchLabels } from '../database';
import { loadProjectsFromGitHub, githubProjects } from '../api/github';
import { get } from 'svelte/store';
import type { Column, Project, Label } from '../database';

/**
 * Load all dashboard data when user logs in
 */
export async function loadDashboardData(): Promise<{
  columns: Column[];
  projects: Project[];
  labels: Label[];
}> {
  // Initialize user columns if needed
  await initializeUserColumns();

  // Fetch GitHub projects
  await loadProjectsFromGitHub();

  // Wait for GitHub projects to be loaded
  const githubProjectsList = Object.values(get(githubProjects));

  if (githubProjectsList.length > 0) {
    // Sync with database
    await syncProjects(githubProjectsList);
  }

  // Fetch updated data
  const [columns, projects, labels] = await Promise.all([
    fetchColumns(),
    fetchProjects(),
    fetchLabels()
  ]);

  return { columns, projects, labels };
}