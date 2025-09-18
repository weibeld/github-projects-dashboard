import type { Label, Status } from '../database';

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
  statuses: Status[],
  currentStatusId?: string
): boolean {
  if (!title.trim()) return false;

  const trimmedTitle = title.trim();
  return statuses.some(status => {
    // When editing, exclude the current status from duplicate check
    if (currentStatusId && status.id === currentStatusId) return false;
    return status.title === trimmedTitle;
  });
}