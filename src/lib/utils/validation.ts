import type { Label, Column } from '../business/legacy/types';

/**
 * Check if a label name is duplicate
 */
export function isDuplicateLabelName(
  title: string,
  labels: Label[],
  currentLabelId?: string
): boolean {
  if (!title.trim()) return false;

  const trimmedTitle = title.trim();
  return labels.some(label => {
    // When editing, exclude the current label from duplicate check
    if (currentLabelId && label.id === currentLabelId) return false;
    return label.title.toLowerCase() === trimmedTitle.toLowerCase();
  });
}

/**
 * Check if a column name is duplicate for new columns
 */
export function isDuplicateColumnName(
  title: string,
  columns: Column[],
  currentColumnId?: string
): boolean {
  if (!title.trim()) return false;

  const trimmedTitle = title.trim();
  return columns.some(column => {
    // When editing, exclude the current column from duplicate check
    if (currentColumnId && column.id === currentColumnId) return false;
    return column.title === trimmedTitle;
  });
}