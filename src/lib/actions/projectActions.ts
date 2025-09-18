import { updateProjectColumn, fetchProjects } from '../database';
import type { Project } from '../database';

/**
 * Update project column and position
 */
export async function updateProjectColumnAndPosition(
  projectId: string,
  targetColumnId: string,
  newPosition: number,
  projectsStore: { set: (value: Project[]) => void },
  optimisticUpdateFn: (projectId: string, columnId: string, position: number) => void
): Promise<void> {
  try {
    // Apply optimistic update
    optimisticUpdateFn(projectId, targetColumnId, newPosition);

    // Update in database
    await updateProjectColumn(projectId, targetColumnId, newPosition);
  } catch (err) {
    console.error('Update project column error:', err);

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