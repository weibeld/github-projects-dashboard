import { get } from 'svelte/store';
import { createColumn, createColumnAfter, deleteColumn, updateColumnTitle, updateColumnPositions, fetchColumns, fetchProjects, updateColumnSorting } from '../database';
import type { Column, SortField, SortDirection } from '../database';
import {
  newColumnTitle,
  creatingColumn,
  insertAfterColumnId,
  showCreateColumn,
  columnToDelete,
  deletingColumn,
  showDeleteColumn,
  columnToEdit,
  editColumnTitle,
  editingColumn,
  showEditColumn,
  resetColumnCreateState,
  resetColumnDeleteState,
  resetColumnEditState
} from '../ui/uiState';

/**
 * Create new column
 */
export async function handleCreateColumn(
  columnsStore: { set: (value: Column[]) => void }
): Promise<void> {
  const title = get(newColumnTitle);
  const isCreating = get(creatingColumn);
  const afterColumnId = get(insertAfterColumnId);

  if (!title.trim()) {
    throw new Error('Title is required');
  }

  if (isCreating) {
    throw new Error('Already creating column');
  }

  creatingColumn.set(true);
  try {
    if (afterColumnId) {
      // Insert after specific column
      await createColumnAfter(title.trim(), afterColumnId);
    } else {
      // Default behavior (before Closed)
      await createColumn(title.trim());
    }

    // Refresh columns
    const updatedColumns = await fetchColumns();
    columnsStore.set([...updatedColumns]);

    // Reset form
    resetColumnCreateState();
  } finally {
    creatingColumn.set(false);
  }
}

/**
 * Show delete column confirmation
 */
export function showDeleteColumnConfirmation(column: Column) {
  columnToDelete.set(column);
  showDeleteColumn.set(true);
}

/**
 * Confirm delete column
 */
export async function confirmDeleteColumn(
  columnsStore: { set: (value: Column[]) => void },
  projectsStore: { set: (value: any[]) => void }
): Promise<void> {
  const column = get(columnToDelete);
  const isDeleting = get(deletingColumn);

  if (!column) {
    throw new Error('No column to delete');
  }

  if (isDeleting) {
    throw new Error('Already deleting column');
  }

  deletingColumn.set(true);
  try {
    await deleteColumn(column.id);

    // Refresh data
    const [updatedColumns, updatedProjects] = await Promise.all([
      fetchColumns(),
      fetchProjects()
    ]);
    columnsStore.set([...updatedColumns]);
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
export function showEditColumnModal(column: Column) {
  columnToEdit.set(column);
  editColumnTitle.set(column.title);
  showEditColumn.set(true);
}

/**
 * Handle edit column
 */
export async function handleEditColumn(
  columnsStore: { set: (value: Column[]) => void }
): Promise<void> {
  const title = get(editColumnTitle);
  const column = get(columnToEdit);
  const isEditing = get(editingColumn);

  if (!title.trim()) {
    throw new Error('Title is required');
  }

  if (!column) {
    throw new Error('No column to edit');
  }

  if (isEditing) {
    throw new Error('Already editing column');
  }

  editingColumn.set(true);
  try {
    await updateColumnTitle(column.id, title.trim());

    // Refresh columns
    const updatedColumns = await fetchColumns();
    columnsStore.set([...updatedColumns]);

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
  column: Column,
  columns: Column[],
  columnsStore: { set: (value: Column[]) => void }
): Promise<void> {
  if (column.is_system) {
    throw new Error("Can't move system columns");
  }

  const currentIndex = columns.findIndex(s => s.id === column.id);
  if (currentIndex <= 1) {
    throw new Error("Can't move past No Status");
  }

  // Check if we're trying to move before "No Status"
  const noStatusColumnIndex = columns.findIndex(s => s.title === 'No Status');
  if (currentIndex - 1 <= noStatusColumnIndex) {
    throw new Error("Can't move before No Status");
  }

  try {
    // Swap positions with the column to the left
    const newColumns = [...columns];
    [newColumns[currentIndex], newColumns[currentIndex - 1]] = [newColumns[currentIndex - 1], newColumns[currentIndex]];

    // Update positions in database
    const columnUpdates = [
      { id: newColumns[currentIndex - 1].id, position: currentIndex - 1 },
      { id: newColumns[currentIndex].id, position: currentIndex }
    ];

    // Optimistic update
    columnsStore.set(newColumns);

    // Update database
    await updateColumnPositions(columnUpdates);
  } catch (err) {
    console.error('Move column left error:', err);

    // Refresh on error
    const updatedColumns = await fetchColumns();
    columnsStore.set([...updatedColumns]);

    throw err;
  }
}

/**
 * Move column right
 */
export async function moveColumnRight(
  column: Column,
  columns: Column[],
  columnsStore: { set: (value: Column[]) => void }
): Promise<void> {
  if (column.is_system) {
    throw new Error("Can't move system columns");
  }

  const currentIndex = columns.findIndex(s => s.id === column.id);
  if (currentIndex >= columns.length - 1) {
    throw new Error("Can't move past last position");
  }

  // Check if we're trying to move past "Closed"
  const closedColumnIndex = columns.findIndex(s => s.title === 'Closed');
  if (currentIndex + 1 >= closedColumnIndex) {
    throw new Error("Can't move past Closed");
  }

  try {
    // Swap positions with the column to the right
    const newColumns = [...columns];
    [newColumns[currentIndex], newColumns[currentIndex + 1]] = [newColumns[currentIndex + 1], newColumns[currentIndex]];

    // Update positions in database
    const columnUpdates = [
      { id: newColumns[currentIndex].id, position: currentIndex },
      { id: newColumns[currentIndex + 1].id, position: currentIndex + 1 }
    ];

    // Optimistic update
    columnsStore.set(newColumns);

    // Update database
    await updateColumnPositions(columnUpdates);
  } catch (err) {
    console.error('Move column right error:', err);

    // Refresh on error
    const updatedColumns = await fetchColumns();
    columnsStore.set([...updatedColumns]);

    throw err;
  }
}

/**
 * Helper functions for arrow button visibility
 */
export function canMoveLeft(column: Column, columns: Column[]): boolean {
  if (column.is_system || !columns || columns.length === 0) return false;
  const currentIndex = columns.findIndex(s => s.id === column.id);
  const noStatusColumnIndex = columns.findIndex(s => s.title === 'No Status');
  return currentIndex > noStatusColumnIndex + 1;
}

export function canMoveRight(column: Column, columns: Column[]): boolean {
  if (column.is_system || !columns || columns.length === 0) return false;
  const currentIndex = columns.findIndex(s => s.id === column.id);
  const closedColumnIndex = columns.findIndex(s => s.title === 'Closed');
  return currentIndex < closedColumnIndex - 1;
}

/**
 * Handle sorting change
 */
export async function handleSortingChange(
  columnId: string,
  sortField: SortField,
  sortDirection: SortDirection,
  columns: Column[],
  columnsStore: { set: (value: Column[]) => void }
): Promise<void> {
  // Optimistic update - update UI immediately
  const updatedColumns = columns.map(column =>
    column.id === columnId
      ? { ...column, sort_field: sortField, sort_direction: sortDirection }
      : column
  );
  columnsStore.set(updatedColumns);

  // Then update the database in the background
  try {
    await updateColumnSorting(columnId, sortField, sortDirection);
  } catch (err) {
    console.error('Update sorting error:', err);

    // If database update fails, revert the optimistic update
    const revertedColumns = await fetchColumns();
    columnsStore.set([...revertedColumns]);

    throw err;
  }
}