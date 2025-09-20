import { loadAllData, loadProjectsFromGitHub, syncProjects, columns, projects, labels, githubProjects } from '../business';
import { get } from 'svelte/store';
import type { Column, Project, Label } from '../business/types';

/**
 * Load all dashboard data when user logs in
 */
export async function loadDashboardData(): Promise<{
  columns: Column[];
  projects: Project[];
  labels: Label[];
}> {
  // Ensure system columns exist
  await ensureSystemColumns();

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