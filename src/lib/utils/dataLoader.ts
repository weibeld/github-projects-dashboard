import { initializeUserStatuses, syncProjects, fetchStatuses, fetchProjects, fetchLabels } from '../database';
import { loadProjectsFromGitHub, githubProjects } from '../api/github';
import { get } from 'svelte/store';
import type { Status, Project, Label } from '../database';

/**
 * Load all dashboard data when user logs in
 */
export async function loadDashboardData(): Promise<{
  statuses: Status[];
  projects: Project[];
  labels: Label[];
}> {
  // Initialize user statuses if needed
  await initializeUserStatuses();

  // Fetch GitHub projects
  await loadProjectsFromGitHub();

  // Wait for GitHub projects to be loaded
  const githubProjectsList = Object.values(get(githubProjects));

  if (githubProjectsList.length > 0) {
    // Sync with database
    await syncProjects(githubProjectsList);
  }

  // Fetch updated data
  const [statuses, projects, labels] = await Promise.all([
    fetchStatuses(),
    fetchProjects(),
    fetchLabels()
  ]);

  return { statuses, projects, labels };
}