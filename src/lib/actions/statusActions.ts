import { get } from 'svelte/store';
import { createStatus, createStatusAfter, deleteStatus, updateStatusTitle, updateStatusPositions, fetchStatuses, fetchProjects, updateStatusSorting } from '../database';
import type { Status, SortField, SortDirection } from '../database';
import {
  newColumnTitle,
  creatingColumn,
  insertAfterStatusId,
  showCreateColumn,
  statusToDelete,
  deletingColumn,
  showDeleteColumn,
  statusToEdit,
  editColumnTitle,
  editingColumn,
  showEditColumn,
  resetColumnCreateState,
  resetColumnDeleteState,
  resetColumnEditState
} from '../ui/uiState';

/**
 * Create new status/column
 */
export async function handleCreateStatus(
  statusesStore: { set: (value: Status[]) => void }
): Promise<void> {
  const title = get(newColumnTitle);
  const isCreating = get(creatingColumn);
  const afterStatusId = get(insertAfterStatusId);

  if (!title.trim()) {
    throw new Error('Title is required');
  }

  if (isCreating) {
    throw new Error('Already creating column');
  }

  creatingColumn.set(true);
  try {
    if (afterStatusId) {
      // Insert after specific status
      await createStatusAfter(title.trim(), afterStatusId);
    } else {
      // Default behavior (before Closed)
      await createStatus(title.trim());
    }

    // Refresh statuses
    const updatedStatuses = await fetchStatuses();
    statusesStore.set([...updatedStatuses]);

    // Reset form
    resetColumnCreateState();
  } finally {
    creatingColumn.set(false);
  }
}

/**
 * Show delete column confirmation
 */
export function showDeleteColumnConfirmation(status: Status) {
  statusToDelete.set(status);
  showDeleteColumn.set(true);
}

/**
 * Confirm delete column
 */
export async function confirmDeleteColumn(
  statusesStore: { set: (value: Status[]) => void },
  projectsStore: { set: (value: any[]) => void }
): Promise<void> {
  const status = get(statusToDelete);
  const isDeleting = get(deletingColumn);

  if (!status) {
    throw new Error('No status to delete');
  }

  if (isDeleting) {
    throw new Error('Already deleting column');
  }

  deletingColumn.set(true);
  try {
    await deleteStatus(status.id);

    // Refresh data
    const [updatedStatuses, updatedProjects] = await Promise.all([
      fetchStatuses(),
      fetchProjects()
    ]);
    statusesStore.set([...updatedStatuses]);
    projectsStore.set([...updatedProjects]);

    // Reset state
    resetColumnDeleteState();
  } finally {
    deletingColumn.set(false);
  }
}

/**
 * Cancel delete column
 */
export function cancelDeleteColumn() {
  resetColumnDeleteState();
}

/**
 * Show edit column modal
 */
export function showEditColumnModal(status: Status) {
  statusToEdit.set(status);
  editColumnTitle.set(status.title);
  showEditColumn.set(true);
}

/**
 * Handle edit column
 */
export async function handleEditColumn(
  statusesStore: { set: (value: Status[]) => void }
): Promise<void> {
  const title = get(editColumnTitle);
  const status = get(statusToEdit);
  const isEditing = get(editingColumn);

  if (!title.trim()) {
    throw new Error('Title is required');
  }

  if (!status) {
    throw new Error('No status to edit');
  }

  if (isEditing) {
    throw new Error('Already editing column');
  }

  editingColumn.set(true);
  try {
    await updateStatusTitle(status.id, title.trim());

    // Refresh statuses
    const updatedStatuses = await fetchStatuses();
    statusesStore.set([...updatedStatuses]);

    // Reset state
    resetColumnEditState();
  } finally {
    editingColumn.set(false);
  }
}

/**
 * Cancel edit column
 */
export function cancelEditColumn() {
  resetColumnEditState();
}

/**
 * Move column left
 */
export async function moveColumnLeft(
  status: Status,
  statuses: Status[],
  statusesStore: { set: (value: Status[]) => void }
): Promise<void> {
  if (status.is_system) {
    throw new Error("Can't move system columns");
  }

  const currentIndex = statuses.findIndex(s => s.id === status.id);
  if (currentIndex <= 1) {
    throw new Error("Can't move past No Status");
  }

  // Check if we're trying to move before "No Status"
  const noStatusIndex = statuses.findIndex(s => s.title === 'No Status');
  if (currentIndex - 1 <= noStatusIndex) {
    throw new Error("Can't move before No Status");
  }

  try {
    // Swap positions with the column to the left
    const newStatuses = [...statuses];
    [newStatuses[currentIndex], newStatuses[currentIndex - 1]] = [newStatuses[currentIndex - 1], newStatuses[currentIndex]];

    // Update positions in database
    const statusUpdates = [
      { id: newStatuses[currentIndex - 1].id, position: currentIndex - 1 },
      { id: newStatuses[currentIndex].id, position: currentIndex }
    ];

    // Optimistic update
    statusesStore.set(newStatuses);

    // Update database
    await updateStatusPositions(statusUpdates);
  } catch (err) {
    console.error('Move column left error:', err);

    // Refresh on error
    const updatedStatuses = await fetchStatuses();
    statusesStore.set([...updatedStatuses]);

    throw err;
  }
}

/**
 * Move column right
 */
export async function moveColumnRight(
  status: Status,
  statuses: Status[],
  statusesStore: { set: (value: Status[]) => void }
): Promise<void> {
  if (status.is_system) {
    throw new Error("Can't move system columns");
  }

  const currentIndex = statuses.findIndex(s => s.id === status.id);
  if (currentIndex >= statuses.length - 1) {
    throw new Error("Can't move past last position");
  }

  // Check if we're trying to move past "Closed"
  const closedIndex = statuses.findIndex(s => s.title === 'Closed');
  if (currentIndex + 1 >= closedIndex) {
    throw new Error("Can't move past Closed");
  }

  try {
    // Swap positions with the column to the right
    const newStatuses = [...statuses];
    [newStatuses[currentIndex], newStatuses[currentIndex + 1]] = [newStatuses[currentIndex + 1], newStatuses[currentIndex]];

    // Update positions in database
    const statusUpdates = [
      { id: newStatuses[currentIndex].id, position: currentIndex },
      { id: newStatuses[currentIndex + 1].id, position: currentIndex + 1 }
    ];

    // Optimistic update
    statusesStore.set(newStatuses);

    // Update database
    await updateStatusPositions(statusUpdates);
  } catch (err) {
    console.error('Move column right error:', err);

    // Refresh on error
    const updatedStatuses = await fetchStatuses();
    statusesStore.set([...updatedStatuses]);

    throw err;
  }
}

/**
 * Helper functions for arrow button visibility
 */
export function canMoveLeft(status: Status, statuses: Status[]): boolean {
  if (status.is_system || !statuses || statuses.length === 0) return false;
  const currentIndex = statuses.findIndex(s => s.id === status.id);
  const noStatusIndex = statuses.findIndex(s => s.title === 'No Status');
  return currentIndex > noStatusIndex + 1;
}

export function canMoveRight(status: Status, statuses: Status[]): boolean {
  if (status.is_system || !statuses || statuses.length === 0) return false;
  const currentIndex = statuses.findIndex(s => s.id === status.id);
  const closedIndex = statuses.findIndex(s => s.title === 'Closed');
  return currentIndex < closedIndex - 1;
}

/**
 * Handle sorting change
 */
export async function handleSortingChange(
  statusId: string,
  sortField: SortField,
  sortDirection: SortDirection,
  statuses: Status[],
  statusesStore: { set: (value: Status[]) => void }
): Promise<void> {
  // Optimistic update - update UI immediately
  const updatedStatuses = statuses.map(status =>
    status.id === statusId
      ? { ...status, sort_field: sortField, sort_direction: sortDirection }
      : status
  );
  statusesStore.set(updatedStatuses);

  // Then update the database in the background
  try {
    await updateStatusSorting(statusId, sortField, sortDirection);
  } catch (err) {
    console.error('Update sorting error:', err);

    // If database update fails, revert the optimistic update
    const revertedStatuses = await fetchStatuses();
    statusesStore.set([...revertedStatuses]);

    throw err;
  }
}