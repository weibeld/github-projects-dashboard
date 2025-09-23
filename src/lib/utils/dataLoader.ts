import { loadAllData, loadProjectsFromGitHub } from '../business';
import type { Column, Project, Label } from '../business/types';

/**
 * Load all dashboard data when user logs in
 */
export async function loadDashboardData(): Promise<{
  columns: Column[];
  projects: Project[];
  labels: Label[];
}> {
  // Fetch GitHub projects
  await loadProjectsFromGitHub();

  // Load all data (this will also sync projects)
  await loadAllData();

  // Return empty arrays for now - the actual data is in the stores
  // This function might need to be refactored to use the store pattern
  return { columns: [], projects: [], labels: [] };
}