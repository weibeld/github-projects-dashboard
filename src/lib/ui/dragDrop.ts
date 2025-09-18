import { writable } from 'svelte/store';
import type { Project, Column } from '../database';
import { updateProjectColumnAndPosition } from '../actions/projectActions';

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
export function handleDragOver(event: DragEvent, columnId: string, columns: Column[]) {
  event.preventDefault();
  dragOverColumn.set(columnId);

  // Don't allow drops into Closed column (assuming it's a system column)
  const targetColumn = columns.find(s => s.id === columnId);
  if (targetColumn?.title === 'Closed') {
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
export function handleDragLeave(event: DragEvent, columnId: string) {
  // Only clear if we're actually leaving the drop zone
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;

  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    dragOverColumn.update(current => current === columnId ? null : current);
  }
}

/**
 * Handle drop
 */
export async function handleDrop(
  event: DragEvent,
  targetColumnId: string,
  columns: Column[],
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
  const targetColumn = columns.find(s => s.id === targetColumnId);
  if (targetColumn?.title === 'Closed') {
    draggedProject.set(null);
    throw new Error('Cannot drop into Closed column');
  }

  // Don't process if dropping in same column
  if (draggedProj.column_id === targetColumnId) {
    draggedProject.set(null);
    throw new Error('Cannot drop in same column');
  }

  try {
    // Calculate new position (add to end of target column)
    const targetProjects = groupedProjects[targetColumnId] || [];
    const newPosition = targetProjects.length;

    // Optimistic update function
    const optimisticUpdate = (projectId: string, columnId: string, position: number) => {
      const updatedProjects = projects.map(p =>
        p.id === projectId
          ? { ...p, column_id: columnId, position: position }
          : p
      );
      projectsStore.set(updatedProjects);
    };

    // Update project column and position
    await updateProjectColumnAndPosition(
      draggedProj.id,
      targetColumnId,
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