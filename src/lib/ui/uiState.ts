import { writable } from 'svelte/store';
import type { Label, Status } from '../database';

// Label dropdown management
export const activeDropdownProjectId = writable<string | null>(null);
export const labelSearchQuery = writable<string>('');
export const newLabelFromSearch = writable<string>('');

// Keyboard navigation for dropdown
export const selectedLabelIndex = writable<number>(-1);

// Sort dropdown management
export const activeSortFieldDropdown = writable<string | null>(null);
export const selectedSortFieldIndex = writable<number>(-1);

// Confirmation modal state
export const showDeleteConfirmation = writable<boolean>(false);
export const labelToDelete = writable<Label | null>(null);
export const labelProjectCount = writable<number>(0);

// Edit label modal state (also used for creating new labels)
export const showEditLabel = writable<boolean>(false);
export const labelToEdit = writable<Label | null>(null); // null when creating new label
export const editLabelTitle = writable<string>('');
export const editLabelColor = writable<string>('');
export const editLabelTextColor = writable<'white' | 'black'>('white');
export const editingLabel = writable<boolean>(false);
export const deletingLabel = writable<boolean>(false);
export const projectIdForNewLabel = writable<string | null>(null); // Track which project to add new label to

// Collapsible section state
export const addedSectionCollapsed = writable<boolean>(true);
export const availableSectionCollapsed = writable<boolean>(false);

// Column creation state
export const showCreateColumn = writable<boolean>(false);
export const newColumnTitle = writable<string>('');
export const creatingColumn = writable<boolean>(false);
export const insertAfterStatusId = writable<string | null>(null); // Track which status to insert after

// Column deletion state
export const showDeleteColumn = writable<boolean>(false);
export const statusToDelete = writable<Status | null>(null);
export const deletingColumn = writable<boolean>(false);

// Column editing state
export const showEditColumn = writable<boolean>(false);
export const statusToEdit = writable<Status | null>(null);
export const editColumnTitle = writable<string>('');
export const editingColumn = writable<boolean>(false);

// Track when we just opened edit modal for existing label (to preserve their text color choice)
export const justOpenedEditModal = writable<boolean>(false);

// General UI state
export const searchQuery = writable<string>('');

// Functions to reset UI state
export function resetLabelDropdownState() {
  activeDropdownProjectId.set(null);
  labelSearchQuery.set('');
  newLabelFromSearch.set('');
  selectedLabelIndex.set(-1);
}

export function resetLabelEditState() {
  showEditLabel.set(false);
  labelToEdit.set(null);
  editLabelTitle.set('');
  editLabelColor.set('');
  editLabelTextColor.set('white');
  editingLabel.set(false);
  projectIdForNewLabel.set(null);
  justOpenedEditModal.set(false);
}

export function resetColumnEditState() {
  showEditColumn.set(false);
  statusToEdit.set(null);
  editColumnTitle.set('');
}

export function resetColumnCreateState() {
  showCreateColumn.set(false);
  newColumnTitle.set('');
  insertAfterStatusId.set(null);
}

export function resetColumnDeleteState() {
  showDeleteColumn.set(false);
  statusToDelete.set(null);
}