import { updateProjectStatus, fetchProjects } from '../database';
import type { Project } from '../database';

/**
 * Update project status and position
 */
export async function updateProjectStatusAndPosition(
  projectId: string,
  targetStatusId: string,
  newPosition: number,
  projectsStore: { set: (value: Project[]) => void },
  optimisticUpdateFn: (projectId: string, statusId: string, position: number) => void
): Promise<void> {
  try {
    // Apply optimistic update
    optimisticUpdateFn(projectId, targetStatusId, newPosition);

    // Update in database
    await updateProjectStatus(projectId, targetStatusId, newPosition);
  } catch (err) {
    console.error('Update project status error:', err);

    // On error, refresh from database to revert optimistic update
    try {
      const dbProjects = await fetchProjects();
      projectsStore.set([...dbProjects]);
    } catch (fetchErr) {
      console.error('Failed to refresh projects after error:', fetchErr);
    }

    throw err;
  }
}