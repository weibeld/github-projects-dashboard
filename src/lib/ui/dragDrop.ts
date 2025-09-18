import { writable } from 'svelte/store';
import type { Project, Status } from '../database';
import { updateProjectStatusAndPosition } from '../actions/projectActions';

// Drag and drop state
export const draggedProject = writable<Project | null>(null);
export const dragOverColumn = writable<string | null>(null);

/**
 * Handle drag start
 */
export function handleDragStart(event: DragEvent, project: Project) {
  draggedProject.set(project);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', project.id);
  }
}

/**
 * Handle drag end
 */
export function handleDragEnd() {
  draggedProject.set(null);
  dragOverColumn.set(null);
}

/**
 * Handle drag over
 */
export function handleDragOver(event: DragEvent, statusId: string, statuses: Status[]) {
  event.preventDefault();
  dragOverColumn.set(statusId);

  // Don't allow drops into Closed column (assuming it's a system status)
  const targetStatus = statuses.find(s => s.id === statusId);
  if (targetStatus?.title === 'Closed') {
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'none';
    }
    return;
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

/**
 * Handle drag leave
 */
export function handleDragLeave(event: DragEvent, statusId: string) {
  // Only clear if we're actually leaving the drop zone
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;

  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    dragOverColumn.update(current => current === statusId ? null : current);
  }
}

/**
 * Handle drop
 */
export async function handleDrop(
  event: DragEvent,
  targetStatusId: string,
  statuses: Status[],
  groupedProjects: Record<string, Project[]>,
  projects: Project[],
  projectsStore: { set: (value: Project[]) => void }
): Promise<void> {
  event.preventDefault();
  dragOverColumn.set(null);

  const draggedProj = await new Promise<Project | null>((resolve) => {
    draggedProject.subscribe(value => resolve(value))();
  });

  if (!draggedProj) {
    throw new Error('No dragged project');
  }

  // Don't allow drops into Closed column
  const targetStatus = statuses.find(s => s.id === targetStatusId);
  if (targetStatus?.title === 'Closed') {
    draggedProject.set(null);
    throw new Error('Cannot drop into Closed column');
  }

  // Don't process if dropping in same column
  if (draggedProj.status_id === targetStatusId) {
    draggedProject.set(null);
    throw new Error('Cannot drop in same column');
  }

  try {
    // Calculate new position (add to end of target column)
    const targetProjects = groupedProjects[targetStatusId] || [];
    const newPosition = targetProjects.length;

    // Optimistic update function
    const optimisticUpdate = (projectId: string, statusId: string, position: number) => {
      const updatedProjects = projects.map(p =>
        p.id === projectId
          ? { ...p, status_id: statusId, position: position }
          : p
      );
      projectsStore.set(updatedProjects);
    };

    // Update project status and position
    await updateProjectStatusAndPosition(
      draggedProj.id,
      targetStatusId,
      newPosition,
      projectsStore,
      optimisticUpdate
    );

    draggedProject.set(null);
  } catch (err) {
    console.error('Drop error:', err);
    draggedProject.set(null);
    throw err;
  }
}