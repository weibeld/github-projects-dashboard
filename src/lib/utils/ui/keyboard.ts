import { get } from 'svelte/store';
import type { Column, Label } from '../../business/types';
import {
  selectedLabelIndex,
  activeDropdownProjectId,
  activeSortFieldDropdown,
  selectedSortFieldIndex
} from './uiState';
import { addLabelToProject } from '../../business';

/**
 * Scroll to selected label to ensure it's visible
 */
export function scrollToSelectedLabel() {
  const index = get(selectedLabelIndex);
  if (index === -1) return;

  setTimeout(() => {
    // Try to find label element first
    let selectedElement = document.querySelector(`[data-label-index="${index}"]`) as HTMLElement;

    // If not found, check if it's the "Create new label" button
    if (!selectedElement) {
      selectedElement = document.querySelector('[data-create-label-button="true"]') as HTMLElement;
    }

    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, 0);
}

/**
 * Handle keyboard events for label dropdown navigation
 */
export async function handleDropdownKeydown(
  event: KeyboardEvent,
  filteredLabelsForActiveProject: Label[],
  _projectsStore: { set: (value: any[]) => void }
) {
  const availableLabels = filteredLabelsForActiveProject;
  const maxIndex = availableLabels.length; // availableLabels.length = "Create new label" button index

  switch (event.key) {
    case 'ArrowDown':
    case 'Tab':
      event.preventDefault();
      if (event.shiftKey && event.key === 'Tab') {
        // Shift+Tab = move up (like ArrowUp)
        selectedLabelIndex.update(index => Math.max(index - 1, -1));
      } else {
        // Tab or ArrowDown = move down
        selectedLabelIndex.update(index => Math.min(index + 1, maxIndex));
      }
      scrollToSelectedLabel();
      break;
    case 'ArrowUp':
      event.preventDefault();
      selectedLabelIndex.update(index => Math.max(index - 1, -1));
      scrollToSelectedLabel();
      break;
    case 'Enter':
      event.preventDefault();
      const currentIndex = get(selectedLabelIndex);
      const activeProjectId = get(activeDropdownProjectId);

      if (currentIndex >= 0 && currentIndex < availableLabels.length && activeProjectId) {
        // Selected a label
        const selectedLabel = availableLabels[currentIndex];
        await addLabelToProject(activeProjectId, selectedLabel.id);
      } else if (currentIndex === availableLabels.length) {
        // Selected "Create new label" button
        // TODO: implement createLabelFromSearch();
      }
      break;
    case 'Escape':
      event.preventDefault();
      // TODO: implement closeLabelDropdown();
      break;
  }
}

/**
 * Handle keyboard events for sort field dropdown navigation
 */
export function handleSortFieldKeydown(
  event: KeyboardEvent,
  columnId: string,
  columns: Column[],
  _columnsStore: { set: (value: Column[]) => void }
) {
  const column = columns.find(s => s.id === columnId);
  const sortFieldOptions = column?.title === 'Closed'
    ? ['title', 'number', 'items', 'updatedAt', 'createdAt', 'closedAt']
    : ['title', 'number', 'items', 'updatedAt', 'createdAt'];
  const maxIndex = sortFieldOptions.length - 1;

  switch (event.key) {
    case 'ArrowDown':
    case 'Tab':
      event.preventDefault();
      if (event.shiftKey && event.key === 'Tab') {
        selectedSortFieldIndex.update(index => index <= 0 ? maxIndex : index - 1);
      } else {
        selectedSortFieldIndex.update(index => index < 0 ? 0 : Math.min(index + 1, maxIndex));
      }
      break;
    case 'ArrowUp':
      event.preventDefault();
      selectedSortFieldIndex.update(index => index <= 0 ? maxIndex : index - 1);
      break;
    case 'Enter':
      event.preventDefault();
      const currentIndex = get(selectedSortFieldIndex);
      if (currentIndex >= 0) {
        // TODO: implement handleSortingChange();
        // const field = sortFieldOptions[currentIndex];
        // await updateColumnSortField(columnId, field as any);
        activeSortFieldDropdown.set(null);
        selectedSortFieldIndex.set(-1);
      }
      break;
    case 'Escape':
      event.preventDefault();
      activeSortFieldDropdown.set(null);
      selectedSortFieldIndex.set(-1);
      break;
  }
}