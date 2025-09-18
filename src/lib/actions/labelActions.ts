import { get } from 'svelte/store';
import { createLabel, deleteLabel, addProjectLabel, removeProjectLabel, fetchLabels, fetchProjects } from '../database';
import { supabase } from '../api/supabase';
import type { Label, Project } from '../database';
import {
  activeDropdownProjectId,
  labelSearchQuery,
  newLabelFromSearch,
  selectedLabelIndex,
  showDeleteConfirmation,
  labelToDelete,
  labelProjectCount,
  showEditLabel,
  labelToEdit,
  editLabelTitle,
  editLabelColor,
  editLabelTextColor,
  editingLabel,
  deletingLabel,
  projectIdForNewLabel,
  addedSectionCollapsed,
  availableSectionCollapsed,
  resetLabelDropdownState,
  resetLabelEditState
} from '../ui/uiState';

/**
 * Toggle label dropdown for a project
 */
export function toggleLabelDropdown(projectId: string) {
  const currentActiveId = get(activeDropdownProjectId);

  if (currentActiveId === projectId) {
    // Close dropdown
    resetLabelDropdownState();
  } else {
    // Open dropdown for this project
    activeDropdownProjectId.set(projectId);
    labelSearchQuery.set('');
    newLabelFromSearch.set('');
    selectedLabelIndex.set(-1);

    // Focus the search input after the dropdown renders
    setTimeout(() => {
      const searchInput = document.querySelector(`input[placeholder="Filter labels..."]`) as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }, 0);
  }
}

/**
 * Close label dropdown
 */
export function closeLabelDropdown() {
  resetLabelDropdownState();
}

/**
 * Get filtered labels based on search query and available labels for a project
 */
export function getFilteredLabels(projectId: string, projects: Project[], labels: Label[]) {
  const projectLabelIds = new Set(projects.find(p => p.id === projectId)?.labels?.map(l => l.id) || []);
  let availableLabels = labels.filter(l => !projectLabelIds.has(l.id));

  const query = get(labelSearchQuery);
  if (query.trim()) {
    availableLabels = availableLabels.filter(l =>
      l.title.toLowerCase().includes(query.toLowerCase())
    );
  }

  return availableLabels;
}

/**
 * Handle adding label to project from dropdown
 */
export async function handleAddLabelToProject(
  projectId: string,
  labelId: string,
  projectsStore: { set: (value: Project[]) => void }
): Promise<void> {
  await addProjectLabel(projectId, labelId);

  // Refresh projects data
  const updatedProjects = await fetchProjects();
  projectsStore.set([...updatedProjects]);

  // Close dropdown
  closeLabelDropdown();
}

/**
 * Get count of projects using a label
 */
export function getProjectCountForLabel(labelId: string, projects: Project[]): number {
  return projects.filter(project =>
    project.labels && project.labels.some(label => label.id === labelId)
  ).length;
}

/**
 * Handle label deletion from dropdown (entire label deletion)
 */
export async function handleDeleteLabelFromDropdown(
  label: Label,
  projects: Project[],
  labelsStore: { set: (value: Label[]) => void },
  projectsStore: { set: (value: Project[]) => void }
): Promise<void> {
  const projectCount = getProjectCountForLabel(label.id, projects);

  if (projectCount === 0) {
    // No projects using this label - delete directly without confirmation
    await deleteLabelDirectly(label, labelsStore, projectsStore);
  } else {
    // Label is used - show confirmation modal
    labelToDelete.set(label);
    labelProjectCount.set(projectCount);
    showDeleteConfirmation.set(true);
  }
}

/**
 * Delete label directly (no confirmation needed)
 */
export async function deleteLabelDirectly(
  label: Label,
  labelsStore: { set: (value: Label[]) => void },
  projectsStore: { set: (value: Project[]) => void }
): Promise<void> {
  await deleteLabel(label.id);

  // Refresh data to reflect the deletion
  const [updatedLabels, updatedProjects] = await Promise.all([
    fetchLabels(),
    fetchProjects()
  ]);
  labelsStore.set([...updatedLabels]);
  projectsStore.set([...updatedProjects]);
}

/**
 * Confirm and delete label from modal
 */
export async function confirmDeleteLabel(
  labelsStore: { set: (value: Label[]) => void },
  projectsStore: { set: (value: Project[]) => void }
): Promise<void> {
  const label = get(labelToDelete);
  const isDeleting = get(deletingLabel);

  if (!label) {
    throw new Error('No label to delete');
  }

  if (isDeleting) {
    throw new Error('Already deleting label');
  }

  deletingLabel.set(true);
  try {
    await deleteLabelDirectly(label, labelsStore, projectsStore);

    // Close modal
    showDeleteConfirmation.set(false);
    labelToDelete.set(null);
    labelProjectCount.set(0);
  } finally {
    deletingLabel.set(false);
  }
}

/**
 * Cancel label deletion
 */
export function cancelDeleteLabel() {
  showDeleteConfirmation.set(false);
  labelToDelete.set(null);
  labelProjectCount.set(0);
}

/**
 * Handle opening label edit modal
 */
export function handleEditLabel(label: Label) {
  labelToEdit.set(label);
  editLabelTitle.set(label.title);
  editLabelColor.set(label.color);
  editLabelTextColor.set(label.text_color || 'white'); // Use saved text color from database
  showEditLabel.set(true);
}

/**
 * Cancel label editing
 */
export function cancelEditLabel() {
  resetLabelEditState();
}

/**
 * Create new label from search - now opens dialog
 */
export function createLabelFromSearch() {
  // Open edit dialog in create mode
  labelToEdit.set(null); // null indicates creating new label
  editLabelTitle.set(get(labelSearchQuery).trim()); // Use search query as default title
  editLabelColor.set('#ff3232'); // Default red color (RGB 255, 50, 50)
  editLabelTextColor.set('white'); // Will be auto-updated by reactive statement
  projectIdForNewLabel.set(get(activeDropdownProjectId)); // Remember which project to add to
  showEditLabel.set(true);
}

/**
 * Toggle section collapse state
 */
export function toggleAddedSection() {
  addedSectionCollapsed.update(collapsed => !collapsed);
}

export function toggleAvailableSection() {
  availableSectionCollapsed.update(collapsed => !collapsed);
}

/**
 * Save label edits or create new label
 */
export async function saveEditLabel(
  labelsStore: { set: (value: Label[]) => void },
  projectsStore: { set: (value: Project[]) => void }
): Promise<void> {
  const title = get(editLabelTitle);
  const color = get(editLabelColor);
  const textColor = get(editLabelTextColor);
  const label = get(labelToEdit);
  const isEditing = get(editingLabel);
  const projectId = get(projectIdForNewLabel);

  if (!title.trim()) {
    throw new Error('Title is required');
  }

  if (isEditing) {
    throw new Error('Already editing label');
  }

  editingLabel.set(true);
  try {
    if (label) {
      // Editing existing label
      const { error: updateError } = await supabase
        .from('labels')
        .update({
          title: title.trim(),
          color: color,
          text_color: textColor,
          updated_at: new Date().toISOString()
        })
        .eq('id', label.id);

      if (updateError) throw updateError;
    } else {
      // Creating new label
      const newLabel = await createLabel(title.trim(), color, textColor);

      // If we have a project ID, automatically add the new label to that project
      if (projectId) {
        await addProjectLabel(projectId, newLabel.id);

        // Close the dropdown after successful creation and addition
        resetLabelDropdownState();
      } else {
        // Update search query to match the new label title so it appears in the filtered results
        labelSearchQuery.set(newLabel.title);
      }
    }

    // Refresh all data to reflect the changes
    const [updatedLabels, updatedProjects] = await Promise.all([
      fetchLabels(),
      fetchProjects()
    ]);
    labelsStore.set([...updatedLabels]);
    projectsStore.set([...updatedProjects]);

    // Close modal and reset state
    resetLabelEditState();
  } finally {
    editingLabel.set(false);
  }
}

/**
 * Remove label from project
 */
export async function handleRemoveProjectLabel(
  projectId: string,
  labelId: string,
  projectsStore: { set: (value: Project[]) => void }
): Promise<void> {
  await removeProjectLabel(projectId, labelId);

  // Refresh projects to show updated labels
  const updatedProjects = await fetchProjects();
  projectsStore.set([...updatedProjects]);
}