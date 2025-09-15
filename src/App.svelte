<script lang='ts'>
  import { onMount } from 'svelte';
  import { flip } from 'svelte/animate';
  import { setupAuth, login, logout, isLoggedIn, isLoggingOut } from './lib/auth';
  import { loadProjectsFromGitHub, githubProjects } from './lib/github';
  import { initializeUserStatuses, syncProjects, fetchStatuses, fetchProjects, createStatus, createStatusAfter, deleteStatus, updateStatusTitle, updateProjectStatus, fetchLabels, createLabel, deleteLabel, addProjectLabel, removeProjectLabel, updateStatusSorting, sortProjects } from './lib/database';
  import { supabase } from './lib/supabase';
  import type { Status, Project, Label, SortField, SortDirection } from './lib/database';
  import type { GitHubProject } from './lib/github';
  import { parse, filter } from 'liqe';
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';
  import customParseFormat from 'dayjs/plugin/customParseFormat';
  import Modal from './lib/components/Modal.svelte';

  let statuses: Status[] = [];
  let projects: Project[] = [];
  let labels: Label[] = [];
  let githubProjectsData: Record<string, GitHubProject> = {};
  let loading = false;
  let error = '';
  let showAddStatus = false;
  let newStatusTitle = '';
  let creatingStatus = false;
  // Label dropdown management
  let activeDropdownProjectId: string | null = null;
  let labelSearchQuery = '';
  let newLabelFromSearch = '';
  let creatingLabelFromSearch = false;

  // Keyboard navigation for dropdown
  let selectedLabelIndex = -1;

  // Confirmation modal state
  let showDeleteConfirmation = false;
  let labelToDelete: Label | null = null;
  let labelProjectCount = 0;

  // Edit label modal state (also used for creating new labels)
  let showEditLabel = false;
  let labelToEdit: Label | null = null; // null when creating new label
  let editLabelTitle = '';
  let editLabelColor = '';
  let editLabelTextColor: 'white' | 'black' = 'white';
  let editingLabel = false;
  let projectIdForNewLabel: string | null = null; // Track which project to add new label to

  // Collapsible section state
  let addedSectionCollapsed = true;
  let availableSectionCollapsed = false;

  // Column creation state
  let showCreateColumn = false;
  let newColumnTitle = '';
  let creatingColumn = false;
  let insertAfterStatusId: string | null = null; // Track which status to insert after

  // Column deletion state
  let showDeleteColumn = false;
  let statusToDelete: Status | null = null;
  let deletingColumn = false;

  // Column editing state
  let showEditColumn = false;
  let statusToEdit: Status | null = null;
  let editColumnTitle = '';
  let editingColumn = false;

  // Reactive filtered labels for the active dropdown (explicitly depends on labelSearchQuery)
  $: filteredLabelsForActiveProject = (() => {
    if (!activeDropdownProjectId || !labels || !projects) return [];

    const projectLabelIds = new Set(projects.find(p => p.id === activeDropdownProjectId)?.labels?.map(l => l.id) || []);
    let availableLabels = labels.filter(l => !projectLabelIds.has(l.id));

    if (labelSearchQuery.trim()) {
      availableLabels = availableLabels.filter(l =>
        l.title.toLowerCase().includes(labelSearchQuery.toLowerCase())
      );
    }

    return availableLabels;
  })();

  // Reactive added labels for the active dropdown (filtered by search)
  $: addedLabelsForActiveProject = (() => {
    if (!activeDropdownProjectId || !labels || !projects) return [];

    const project = projects.find(p => p.id === activeDropdownProjectId);
    if (!project || !project.labels) return [];

    let addedLabels = project.labels;

    if (labelSearchQuery.trim()) {
      addedLabels = addedLabels.filter(l =>
        l.title.toLowerCase().includes(labelSearchQuery.toLowerCase())
      );
    }

    return addedLabels;
  })();

  // Check if we should show search results (when there's a search query)
  $: showSearchResults = labelSearchQuery.trim().length > 0;

  // Update newLabelFromSearch based on search query and filtered results
  $: {
    if (activeDropdownProjectId && labelSearchQuery.trim()) {
      const query = labelSearchQuery.trim();
      const allMatchingLabels = [...filteredLabelsForActiveProject, ...addedLabelsForActiveProject];

      // If query doesn't match any existing labels (available or added), set it as potential new label
      if (!allMatchingLabels.some(l => l.title.toLowerCase() === query.toLowerCase())) {
        newLabelFromSearch = query;
      } else {
        newLabelFromSearch = '';
      }
    } else {
      newLabelFromSearch = '';
    }

    // Auto-select first item when search query changes (but not when empty)
    if (activeDropdownProjectId && labelSearchQuery.trim()) {
      if (filteredLabelsForActiveProject.length > 0) {
        // Focus on first available label
        selectedLabelIndex = 0;
      } else {
        // No labels available, focus on "Create new label" button
        selectedLabelIndex = 0; // This will be the "Create new label" button index
      }
    } else {
      selectedLabelIndex = -1;
    }
  }

  // Label name duplicate validation
  $: isDuplicateLabelName = (() => {
    if (!editLabelTitle.trim()) return false;

    const trimmedTitle = editLabelTitle.trim();
    return labels.some(label => {
      // When editing, exclude the current label from duplicate check
      if (labelToEdit && label.id === labelToEdit.id) return false;
      return label.title.toLowerCase() === trimmedTitle.toLowerCase();
    });
  })();

  $: labelNameError = isDuplicateLabelName ? 'A label with this name already exists' : '';

  // Column name duplicate validation (for creating new columns)
  $: isDuplicateNewColumnName = (() => {
    if (!newColumnTitle.trim()) return false;

    const trimmedTitle = newColumnTitle.trim();
    return statuses.some(status =>
      status.title === trimmedTitle
    );
  })();

  // Column name duplicate validation (for editing existing columns)
  $: isDuplicateEditColumnName = (() => {
    if (!editColumnTitle.trim()) return false;

    const trimmedTitle = editColumnTitle.trim();
    return statuses.some(status => {
      // When editing, exclude the current status from duplicate check
      if (statusToEdit && status.id === statusToEdit.id) return false;
      return status.title === trimmedTitle;
    });
  })();

  $: newColumnNameError = isDuplicateNewColumnName ? 'A column with this name already exists' : '';
  $: editColumnNameError = isDuplicateEditColumnName ? 'A column with this name already exists' : '';

  // Track when we just opened edit modal for existing label (to preserve their text color choice)
  let justOpenedEditModal = false;

  // Always automatically calculate optimal text color when background color changes
  // Exception: preserve existing text color when initially opening Edit Label modal
  $: if (editLabelColor && !justOpenedEditModal) {
    editLabelTextColor = getOptimalTextColor(editLabelColor);
  }

  // Handle manual text color changes
  function handleTextColorChange(color: 'white' | 'black') {
    editLabelTextColor = color;
  }

  let draggedProject: Project | null = null;
  let dragOverColumn: string | null = null;
  let searchQuery = '';
  let filteredProjects: Project[] = [];

  // Initialize dayjs with plugins
  dayjs.extend(relativeTime);
  dayjs.extend(customParseFormat);

  // Enhanced timestamp formatting functions
  function formatTimestamp(date: Date | null): string {
    if (!date) return '';

    const now = dayjs();
    const dateObj = dayjs(date);
    const diffInDays = now.diff(dateObj, 'day');

    // Use relative time for dates within the last month (30 days)
    if (diffInDays <= 30) {
      return dateObj.fromNow();
    }

    // Use absolute dates for older timestamps
    const currentYear = now.year();
    const dateYear = dateObj.year();

    if (dateYear === currentYear) {
      return dateObj.format('D MMM'); // e.g., "6 Apr"
    } else {
      return dateObj.format('D MMM YYYY'); // e.g., "1 Oct 2024"
    }
  }

  function formatTooltip(date: Date | null): string {
    if (!date) return '';
    return dayjs(date).format('ddd, D MMM YYYY, HH:mm'); // e.g., "Sun, 1 Oct 2024, 14:24"
  }

  // Calculate optimal text color based on background color luminance
  function getOptimalTextColor(backgroundColor: string): 'white' | 'black' {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate relative luminance using sRGB color space
    // Formula from WCAG 2.1 guidelines
    const sRGB = (color: number) => {
      const c = color / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    const luminance = 0.2126 * sRGB(r) + 0.7152 * sRGB(g) + 0.0722 * sRGB(b);

    // If luminance is greater than 0.5, use black text, otherwise use white
    return luminance > 0.5 ? 'black' : 'white';
  }

  // Tooltip state management
  let tooltipVisible = false;
  let tooltipX = 0;
  let tooltipY = 0;
  let tooltipText = '';
  let tooltipTimeout: number | null = null;

  function showTooltip(event: MouseEvent, text: string) {
    // Clear any existing timeout
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }

    tooltipText = text;

    // Position tooltip relative to the target element
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    tooltipX = rect.right + 0;
    tooltipY = rect.bottom + 0;

    // Show tooltip after short delay
    tooltipTimeout = setTimeout(() => {
      tooltipVisible = true;
      tooltipTimeout = null;
    }, 200);
  }

  function hideTooltip() {
    // Clear any pending timeout
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }
    tooltipVisible = false;
  }

  // Subscribe to GitHub projects data
  $: githubProjectsData = $githubProjects;

  // Function to preprocess relative and absolute dates in search queries
  function preprocessDates(query: string): string {
    let processedQuery = query;

    // Process relative dates first
    // Regular expression to match relative date patterns like:
    // "updated:>1 month ago", "created:<2 weeks ago", "closed:>=3 days ago"
    const relativeDateRegex = /(\w+):(>|<|>=|<=|=)(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/gi;

    processedQuery = processedQuery.replace(relativeDateRegex, (match, field, operator, amount, unit) => {
      // Convert relative date to Unix timestamp
      // Normalize unit (remove 's' if plural) and ensure it's a valid dayjs unit
      const normalizedUnit = unit.toLowerCase().replace(/s$/, '') as 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
      const timestamp = Math.floor(dayjs().subtract(parseInt(amount), normalizedUnit).valueOf() / 1000);

      // Reverse the operator logic for intuitive behavior:
      // "created:<1 week ago" should mean "created less than 1 week ago" (more recent)
      // So we need to search for timestamps greater than the calculated timestamp
      let reversedOperator = operator;
      if (operator === '<') reversedOperator = '>';
      else if (operator === '>') reversedOperator = '<';
      else if (operator === '<=') reversedOperator = '>=';
      else if (operator === '>=') reversedOperator = '<=';
      // '=' stays the same

      return `${field}:${reversedOperator}${timestamp}`;
    });

    // Process absolute dates
    // Regular expressions for different absolute date formats:
    // 1. ISO format: "updated:>2025-08-14", "created:<2025-06-01"
    // 2. Short format with current year: "updated:>14 Aug", "created:<1 Jun"
    // 3. Short format with year: "updated:>1 Oct 2024", "created:<14 Aug 2023"

    // ISO date format (YYYY-MM-DD)
    const isoDateRegex = /(\w+):(>|<|>=|<=|=)(\d{4}-\d{2}-\d{2})/gi;
    processedQuery = processedQuery.replace(isoDateRegex, (match, field, operator, dateStr) => {
      const timestamp = Math.floor(dayjs(dateStr).valueOf() / 1000);
      return `${field}:${operator}${timestamp}`;
    });

    // Short format with year (D MMM YYYY)
    const shortDateWithYearRegex = /(\w+):(>|<|>=|<=|=)(\d{1,2}\s+\w{3}\s+\d{4})/gi;
    processedQuery = processedQuery.replace(shortDateWithYearRegex, (match, field, operator, dateStr) => {
      const timestamp = Math.floor(dayjs(dateStr, 'D MMM YYYY').valueOf() / 1000);
      return `${field}:${operator}${timestamp}`;
    });

    // Short format with current year (D MMM)
    const shortDateRegex = /(\w+):(>|<|>=|<=|=)(\d{1,2}\s+\w{3})/gi;
    processedQuery = processedQuery.replace(shortDateRegex, (match, field, operator, dateStr) => {
      const currentYear = dayjs().year();
      const timestamp = Math.floor(dayjs(`${dateStr} ${currentYear}`, 'D MMM YYYY').valueOf() / 1000);
      return `${field}:${operator}${timestamp}`;
    });

    return processedQuery;
  }

  // Apply search filtering using liqe
  $: filteredProjects = (() => {
    if (!searchQuery.trim()) {
      return projects;
    }

    try {
      // Pre-process query to convert relative and absolute dates to timestamps
      const processedQuery = preprocessDates(searchQuery);

      // Parse the Lucene-style query
      const query = parse(processedQuery);

      // Transform projects to searchable format for liqe
      // Naked terms will search across all text fields
      // Explicit field syntax like "title:foo" or "label:bar" for precise targeting
      const searchableProjects = projects.map(project => {
        const githubProject = githubProjectsData[project.id];
        const projectLabels = (project.labels || []).map(l => l.title);

        return {
          ...project,
          // All searchable text fields (for naked terms and explicit field searches)
          title: githubProject?.title || '',
          description: githubProject?.shortDescription || '',
          visibility: githubProject?.visibility || '',
          // Concatenated labels string for label field searches
          label: projectLabels.join(' ').toLowerCase(),
          // Keep numeric and boolean fields for specific searches
          number: githubProject?.number || 0,
          items: githubProject?.items || 0,
          isClosed: githubProject?.isClosed || false,
          // Date fields for temporal searches
          createdAt: githubProject?.createdAt?.toISOString() || '',
          updatedAt: githubProject?.updatedAt?.toISOString() || '',
          closedAt: githubProject?.closedAt?.toISOString() || '',
          // Helper fields for easier date searching
          created: Math.floor((githubProject?.createdAt?.getTime() || 0) / 1000), // Unix timestamp
          updated: Math.floor((githubProject?.updatedAt?.getTime() || 0) / 1000),
          closed: Math.floor((githubProject?.closedAt?.getTime() || 0) / 1000)
        };
      });

      // Filter using liqe
      const filtered = filter(query, searchableProjects);

      // Return original project objects
      return filtered.map(p => projects.find(orig => orig.id === p.id)!);
    } catch (error) {
      // If query is invalid, show all projects
      console.warn('Invalid search query:', searchQuery, error);
      return projects;
    }
  })();

  // Reactive grouped projects - recomputed whenever filteredProjects or statuses change
  $: groupedProjects = statuses.reduce((acc, status) => {
    acc[status.id] = filteredProjects
      .filter(p => p.status_id === status.id)
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {} as Record<string, Project[]>);

  // Load data when user logs in
  async function loadDashboardData() {
    if (!$isLoggedIn) return;

    loading = true;
    error = '';

    try {
      // Initialize user statuses if needed
      await initializeUserStatuses();

      // Fetch GitHub projects
      await loadProjectsFromGitHub();

      // Wait for GitHub projects to be loaded
      const githubProjectsList = Object.values($githubProjects);

      if (githubProjectsList.length > 0) {
        // Sync with database
        await syncProjects(githubProjectsList);
      }

      // Fetch updated data
      [statuses, projects, labels] = await Promise.all([
        fetchStatuses(),
        fetchProjects(),
        fetchLabels()
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
      console.error('Dashboard error:', err);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    setupAuth();

    // Load data when user becomes logged in
    isLoggedIn.subscribe(async (loggedIn) => {
      if (loggedIn) {
        await loadDashboardData();
      }
    });

    // Handle click outside to close label dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdownProjectId && !(event.target as Element)?.closest('.relative')) {
        closeLabelDropdown();
      }
    };
    document.addEventListener('click', handleClickOutside);

    // Handle keyboard events for modals
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showDeleteConfirmation) {
          cancelDeleteLabel();
        } else if (showEditLabel) {
          cancelEditLabel();
        }
      }
    };
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  });


  // Create new status
  async function handleCreateStatus() {
    if (!newStatusTitle.trim() || creatingStatus) return;

    creatingStatus = true;
    try {
      await createStatus(newStatusTitle.trim());

      // Refresh statuses
      const updatedStatuses = await fetchStatuses();
      statuses = [...updatedStatuses];

      // Reset form
      newStatusTitle = '';
      showAddStatus = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create status';
      console.error('Create status error:', err);
    } finally {
      creatingStatus = false;
    }
  }

  // Delete status
  async function handleDeleteStatus(status: Status) {
    if (status.is_system) return; // Can't delete system statuses

    if (!confirm(`Are you sure you want to delete "${status.title}"? All projects in this status will be moved to "No Status".`)) {
      return;
    }

    try {
      await deleteStatus(status.id);

      // Refresh data
      const [updatedStatuses, updatedProjects] = await Promise.all([
        fetchStatuses(),
        fetchProjects()
      ]);
      statuses = [...updatedStatuses];
      projects = [...updatedProjects];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete status';
      console.error('Delete status error:', err);
    }
  }

  // Create new column (status)
  async function handleCreateColumn() {
    if (!newColumnTitle.trim() || creatingColumn || isDuplicateNewColumnName) return;

    creatingColumn = true;
    try {
      if (insertAfterStatusId) {
        // Insert after specific status
        await createStatusAfter(newColumnTitle.trim(), insertAfterStatusId);
      } else {
        // Default behavior (before Closed)
        await createStatus(newColumnTitle.trim());
      }

      // Refresh statuses
      const updatedStatuses = await fetchStatuses();
      statuses = [...updatedStatuses];

      // Reset form
      newColumnTitle = '';
      showCreateColumn = false;
      insertAfterStatusId = null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create column';
      console.error('Create column error:', err);
    } finally {
      creatingColumn = false;
    }
  }

  // Show delete column confirmation
  function showDeleteColumnConfirmation(status: Status) {
    statusToDelete = status;
    showDeleteColumn = true;
  }

  // Confirm delete column
  async function confirmDeleteColumn() {
    if (!statusToDelete || deletingColumn) return;

    deletingColumn = true;
    try {
      await deleteStatus(statusToDelete.id);

      // Refresh data
      const [updatedStatuses, updatedProjects] = await Promise.all([
        fetchStatuses(),
        fetchProjects()
      ]);
      statuses = [...updatedStatuses];
      projects = [...updatedProjects];

      // Reset state
      showDeleteColumn = false;
      statusToDelete = null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete column';
      console.error('Delete column error:', err);
    } finally {
      deletingColumn = false;
    }
  }

  // Cancel delete column
  function cancelDeleteColumn() {
    showDeleteColumn = false;
    statusToDelete = null;
  }

  // Show edit column modal
  function showEditColumnModal(status: Status) {
    statusToEdit = status;
    editColumnTitle = status.title;
    showEditColumn = true;
  }

  // Handle edit column
  async function handleEditColumn() {
    if (!editColumnTitle.trim() || !statusToEdit || editingColumn || isDuplicateEditColumnName) return;

    editingColumn = true;
    try {
      await updateStatusTitle(statusToEdit.id, editColumnTitle.trim());

      // Refresh statuses
      const updatedStatuses = await fetchStatuses();
      statuses = [...updatedStatuses];

      // Reset state
      showEditColumn = false;
      statusToEdit = null;
      editColumnTitle = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update column title';
      console.error('Edit column error:', err);
    } finally {
      editingColumn = false;
    }
  }

  // Cancel edit column
  function cancelEditColumn() {
    showEditColumn = false;
    statusToEdit = null;
    editColumnTitle = '';
  }

  // Handle keyboard events for new status input
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleCreateStatus();
    } else if (event.key === 'Escape') {
      showAddStatus = false;
      newStatusTitle = '';
    }
  }

  // New label dropdown functions
  function toggleLabelDropdown(projectId: string) {
    if (activeDropdownProjectId === projectId) {
      // Close dropdown
      activeDropdownProjectId = null;
      labelSearchQuery = '';
      newLabelFromSearch = '';
      selectedLabelIndex = -1;
    } else {
      // Open dropdown for this project
      activeDropdownProjectId = projectId;
      labelSearchQuery = '';
      newLabelFromSearch = '';
      selectedLabelIndex = -1;

      // Focus the search input after the dropdown renders
      setTimeout(() => {
        const searchInput = document.querySelector(`input[placeholder="Filter labels..."]`) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 0);
    }
  }

  function closeLabelDropdown() {
    activeDropdownProjectId = null;
    labelSearchQuery = '';
    newLabelFromSearch = '';
    selectedLabelIndex = -1;
  }

  // Keyboard navigation functions
  function handleDropdownKeydown(event: KeyboardEvent) {
    const availableLabels = filteredLabelsForActiveProject;
    const maxIndex = availableLabels.length; // availableLabels.length = "Create new label" button index

    switch (event.key) {
      case 'ArrowDown':
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey && event.key === 'Tab') {
          // Shift+Tab = move up (like ArrowUp)
          selectedLabelIndex = Math.max(selectedLabelIndex - 1, -1);
        } else {
          // Tab or ArrowDown = move down
          selectedLabelIndex = Math.min(selectedLabelIndex + 1, maxIndex);
        }
        scrollToSelectedLabel();
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedLabelIndex = Math.max(selectedLabelIndex - 1, -1);
        scrollToSelectedLabel();
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedLabelIndex >= 0 && selectedLabelIndex < availableLabels.length) {
          // Selected a label
          const selectedLabel = availableLabels[selectedLabelIndex];
          handleAddLabelToProject(activeDropdownProjectId, selectedLabel.id);
        } else if (selectedLabelIndex === availableLabels.length) {
          // Selected "Create new label" button
          createLabelFromSearch();
        }
        break;
      case 'Escape':
        event.preventDefault();
        closeLabelDropdown();
        break;
    }
  }

  // Scroll to selected label to ensure it's visible
  function scrollToSelectedLabel() {
    if (selectedLabelIndex === -1) return;

    setTimeout(() => {
      // Try to find label element first
      let selectedElement = document.querySelector(`[data-label-index="${selectedLabelIndex}"]`) as HTMLElement;

      // If not found, check if it's the "Create new label" button
      if (!selectedElement && selectedLabelIndex === filteredLabelsForActiveProject.length) {
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

  // Create new label from search - now opens dialog
  function createLabelFromSearch() {
    // Open edit dialog in create mode
    labelToEdit = null; // null indicates creating new label
    editLabelTitle = labelSearchQuery.trim(); // Use search query as default title
    editLabelColor = '#ff3232'; // Default red color (RGB 255, 50, 50)
    editLabelTextColor = 'white'; // Will be auto-updated by reactive statement
    projectIdForNewLabel = activeDropdownProjectId; // Remember which project to add to
    showEditLabel = true;
  }

  // Get filtered labels based on search query and available labels for a project
  function getFilteredLabels(projectId: string) {
    const projectLabelIds = new Set(projects.find(p => p.id === projectId)?.labels?.map(l => l.id) || []);
    let availableLabels = labels.filter(l => !projectLabelIds.has(l.id));

    if (labelSearchQuery.trim()) {
      availableLabels = availableLabels.filter(l =>
        l.title.toLowerCase().includes(labelSearchQuery.toLowerCase())
      );
    }

    return availableLabels;
  }

  // Handle adding label to project from dropdown
  async function handleAddLabelToProject(projectId: string, labelId: string) {
    try {
      await addProjectLabel(projectId, labelId);

      // Refresh projects data
      const updatedProjects = await fetchProjects();
      projects = [...updatedProjects];

      // Close dropdown
      closeLabelDropdown();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add label';
      console.error('Add label error:', err);
    }
  }

  // Check if a label is used by any projects
  function isLabelUsedByProjects(labelId: string): boolean {
    return projects.some(project =>
      project.labels && project.labels.some(label => label.id === labelId)
    );
  }

  // Get count of projects using a label
  function getProjectCountForLabel(labelId: string): number {
    return projects.filter(project =>
      project.labels && project.labels.some(label => label.id === labelId)
    ).length;
  }

  // Handle label deletion from dropdown (entire label deletion)
  async function handleDeleteLabelFromDropdown(label: Label) {
    const projectCount = getProjectCountForLabel(label.id);

    if (projectCount === 0) {
      // No projects using this label - delete directly without confirmation
      await deleteLabelDirectly(label);
    } else {
      // Label is used - show confirmation modal
      labelToDelete = label;
      labelProjectCount = projectCount;
      showDeleteConfirmation = true;
    }
  }

  // Delete label directly (no confirmation needed)
  async function deleteLabelDirectly(label: Label) {
    try {
      await deleteLabel(label.id);

      // Refresh data to reflect the deletion
      const [updatedLabels, updatedProjects] = await Promise.all([
        fetchLabels(),
        fetchProjects()
      ]);
      labels = [...updatedLabels];
      projects = [...updatedProjects];

    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete label';
      console.error('Delete label error:', err);
    }
  }

  // Confirm and delete label from modal
  async function confirmDeleteLabel() {
    if (!labelToDelete) return;

    await deleteLabelDirectly(labelToDelete);

    // Close modal
    showDeleteConfirmation = false;
    labelToDelete = null;
    labelProjectCount = 0;
  }

  // Cancel label deletion
  function cancelDeleteLabel() {
    showDeleteConfirmation = false;
    labelToDelete = null;
    labelProjectCount = 0;
  }

  // Handle opening label edit modal
  function handleEditLabel(label: Label) {
    labelToEdit = label;
    editLabelTitle = label.title;
    editLabelColor = label.color;
    editLabelTextColor = label.text_color || 'white'; // Use saved text color from database
    justOpenedEditModal = true; // Prevent auto-calculation on initial load
    showEditLabel = true;
  }

  // Cancel label editing
  function cancelEditLabel() {
    showEditLabel = false;
    labelToEdit = null;
    editLabelTitle = '';
    editLabelColor = '';
    editLabelTextColor = 'white';
    editingLabel = false;
    projectIdForNewLabel = null;
    justOpenedEditModal = false;
  }

  // Toggle section collapse state
  function toggleAddedSection() {
    addedSectionCollapsed = !addedSectionCollapsed;
  }

  function toggleAvailableSection() {
    availableSectionCollapsed = !availableSectionCollapsed;
  }

  // Save label edits or create new label
  async function saveEditLabel() {
    if (!editLabelTitle.trim() || editingLabel || isDuplicateLabelName) return;

    editingLabel = true;
    try {
      if (labelToEdit) {
        // Editing existing label
        const { error: updateError } = await supabase
          .from('labels')
          .update({
            title: editLabelTitle.trim(),
            color: editLabelColor,
            text_color: editLabelTextColor,
            updated_at: new Date().toISOString()
          })
          .eq('id', labelToEdit.id);

        if (updateError) throw updateError;
      } else {
        // Creating new label
        const newLabel = await createLabel(editLabelTitle.trim(), editLabelColor, editLabelTextColor);

        // If we have a project ID, automatically add the new label to that project
        if (projectIdForNewLabel) {
          await addProjectLabel(projectIdForNewLabel, newLabel.id);

          // Close the dropdown after successful creation and addition
          activeDropdownProjectId = null;
          labelSearchQuery = '';
          newLabelFromSearch = '';
        } else {
          // Update search query to match the new label title so it appears in the filtered results
          labelSearchQuery = newLabel.title;
        }
      }

      // Refresh all data to reflect the changes
      const [updatedLabels, updatedProjects] = await Promise.all([
        fetchLabels(),
        fetchProjects()
      ]);
      labels = [...updatedLabels];
      projects = [...updatedProjects];

      // Close modal and reset state
      showEditLabel = false;
      labelToEdit = null;
      editLabelTitle = '';
      editLabelColor = '';
      editLabelTextColor = 'white';
      projectIdForNewLabel = null;
      justOpenedEditModal = false;
    } catch (err) {
      error = err instanceof Error ? err.message : (labelToEdit ? 'Failed to update label' : 'Failed to create label');
      console.error('Save label error:', err);
    } finally {
      editingLabel = false;
    }
  }

  // Delete label
  async function handleDeleteLabel(label: Label) {
    if (!confirm(`Are you sure you want to delete "${label.title}"?`)) {
      return;
    }

    try {
      await deleteLabel(label.id);

      // Refresh data
      const [updatedLabels, updatedProjects] = await Promise.all([
        fetchLabels(),
        fetchProjects()
      ]);
      labels = [...updatedLabels];
      projects = [...updatedProjects];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete label';
      console.error('Delete label error:', err);
    }
  }


  // Add label to project
  async function handleAddProjectLabel(projectId: string, labelId: string) {
    try {
      await addProjectLabel(projectId, labelId);

      // Refresh projects to show updated labels
      const updatedProjects = await fetchProjects();
      projects = [...updatedProjects];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add label';
      console.error('Add project label error:', err);
    }
  }

  // Remove label from project
  async function handleRemoveProjectLabel(projectId: string, labelId: string) {
    try {
      await removeProjectLabel(projectId, labelId);

      // Refresh projects to show updated labels
      const updatedProjects = await fetchProjects();
      projects = [...updatedProjects];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to remove label';
      console.error('Remove project label error:', err);
    }
  }

  // Handle sorting change
  async function handleSortingChange(statusId: string, sortField: SortField, sortDirection: SortDirection) {
    try {
      await updateStatusSorting(statusId, sortField, sortDirection);

      // Refresh statuses to show updated sorting preferences
      const updatedStatuses = await fetchStatuses();
      statuses = [...updatedStatuses];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update sorting';
      console.error('Update sorting error:', err);
    }
  }

  // Drag and drop handlers
  function handleDragStart(event: DragEvent, project: Project) {
    draggedProject = project;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', project.id);
    }
  }

  function handleDragEnd() {
    draggedProject = null;
    dragOverColumn = null;
  }

  function handleDragOver(event: DragEvent, statusId: string) {
    event.preventDefault();
    dragOverColumn = statusId;

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

  function handleDragLeave(event: DragEvent, statusId: string) {
    // Only clear if we're actually leaving the drop zone
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      if (dragOverColumn === statusId) {
        dragOverColumn = null;
      }
    }
  }

  async function handleDrop(event: DragEvent, targetStatusId: string) {
    event.preventDefault();
    dragOverColumn = null;

    if (!draggedProject) {
      return;
    }

    // Don't allow drops into Closed column
    const targetStatus = statuses.find(s => s.id === targetStatusId);
    if (targetStatus?.title === 'Closed') {
      draggedProject = null;
      return;
    }

    // Don't process if dropping in same column
    if (draggedProject.status_id === targetStatusId) {
      draggedProject = null;
      return;
    }

    try {
      // Calculate new position (add to end of target column)
      const targetProjects = groupedProjects[targetStatusId] || [];
      const newPosition = targetProjects.length;


      // Update local state immediately (optimistic update)
      const updatedProjects = projects.map(p =>
        p.id === draggedProject.id
          ? { ...p, status_id: targetStatusId, position: newPosition }
          : p
      );
      projects = updatedProjects;

      // Update in database
      await updateProjectStatus(draggedProject.id, targetStatusId, newPosition);

      // Optionally refresh from database to ensure consistency
      // (comment this out if immediate updates work well)
      // const dbProjects = await fetchProjects();
      // projects = [...dbProjects];

    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to move project';
      console.error('Drop error:', err);

      // On error, refresh from database to revert optimistic update
      try {
        const dbProjects = await fetchProjects();
        projects = [...dbProjects];
      } catch (fetchErr) {
        console.error('Failed to refresh projects after error:', fetchErr);
      }
    } finally {
      draggedProject = null;
    }
  }
</script>

<main class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-2xl font-bold text-gray-900">GitHub Projects Dashboard</h1>
      {#if $isLoggedIn}
        <button
          on:click={logout}
          disabled={$isLoggingOut}
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {$isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      {/if}
    </div>

    <!-- Main Content -->
    {#if $isLoggedIn}
      {#if loading}
        <div class="flex items-center justify-center min-h-[400px]">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p class="text-gray-600">Loading your GitHub Projects...</p>
          </div>
        </div>
      {:else if error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p class="text-red-700">Error: {error}</p>
          <button
            on:click={loadDashboardData}
            class="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      {:else}


        <!-- Search Bar -->
        <div class="mb-6">
          <div class="bg-white rounded-lg shadow p-4">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                bind:value={searchQuery}
                placeholder="Search projects... (e.g., &quot;app&quot;, &quot;label:frontend&quot;, &quot;updated:>1 month ago&quot;)"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {#if searchQuery}
                <button
                  on:click={() => searchQuery = ''}
                  class="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Clear search"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                  </svg>
                </button>
              {/if}
            </div>

            <!-- Search Examples -->
            <div class="mt-3 flex flex-wrap gap-2 text-sm">
              <span class="text-gray-500">Examples:</span>
              <button
                on:click={() => searchQuery = 'app'}
                class="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                app
              </button>
              <button
                on:click={() => searchQuery = 'label:frontend'}
                class="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                label:frontend
              </button>
              <button
                on:click={() => searchQuery = 'updated:>1 month ago'}
                class="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                updated:&gt;1 month ago
              </button>
              <button
                on:click={() => searchQuery = 'created:<1 week ago'}
                class="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                created:&lt;1 week ago
              </button>
              <button
                on:click={() => searchQuery = 'isClosed:false'}
                class="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                open projects
              </button>
              <button
                on:click={() => searchQuery = 'updated:>2024-01-01'}
                class="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                updated:&gt;2024-01-01
              </button>
              <button
                on:click={() => searchQuery = 'created:>1 Jan'}
                class="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                created:&gt;1 Jan
              </button>
              <button
                on:click={() => searchQuery = 'updated:<15 Nov 2024'}
                class="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                updated:&lt;15 Nov 2024
              </button>
            </div>

            <!-- Results Summary -->
            {#if searchQuery}
              <div class="mt-3 text-sm text-gray-600">
                Showing {filteredProjects.length} of {projects.length} projects
                {#if filteredProjects.length !== projects.length}
                  <span class="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    {projects.length - filteredProjects.length} hidden
                  </span>
                {/if}
              </div>
            {/if}
          </div>
        </div>


        <!-- Project Dashboard -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {#each statuses as status}
            <div class="{status.title === 'Closed' ? 'bg-red-50' : 'bg-white'} rounded-lg shadow">
              <!-- Column Header -->
              <div class="px-4 py-3 border-b border-gray-200">
                <!-- Top line: Title and action buttons -->
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <h3 class="font-semibold text-gray-900">{status.title}</h3>
                  </div>
                  <div class="flex items-center gap-1">
                    <!-- Edit button (only for non-system statuses) -->
                    {#if !status.is_system}
                      <button
                        on:click={() => showEditColumnModal(status)}
                        class="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit column title"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                      </button>
                    {/if}

                    <!-- Add Column button (not for Closed column) -->
                    {#if status.title !== 'Closed'}
                      <button
                        on:click={() => {
                          insertAfterStatusId = status.id;
                          showCreateColumn = true;
                        }}
                        class="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Add column after {status.title}"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                      </button>
                    {/if}

                    <!-- Delete button (only for non-system statuses) -->
                    {#if !status.is_system}
                      <button
                        on:click={() => showDeleteColumnConfirmation(status)}
                        class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete column"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- Bottom line: Project count and sorting controls -->
                <div class="flex items-center justify-between">
                  <p class="text-sm text-gray-500">
                    {(groupedProjects[status.id] || []).length} projects
                  </p>
                  <div class="flex items-center gap-1">
                  <!-- Sort Field dropdown -->
                  <select
                    on:change={(e) => {
                      const field = e.currentTarget.value as SortField;
                      handleSortingChange(status.id, field, status.sort_direction || 'desc');
                    }}
                    value="{(() => {
                      const currentField = status.sort_field || 'number';
                      // Context-aware field validation for UI
                      if (status.title === 'Closed' && currentField === 'updated') {
                        return 'closed';
                      } else if (status.title !== 'Closed' && currentField === 'closed') {
                        return 'updated';
                      }
                      return currentField;
                    })()}"
                    class="text-xs px-2 py-1 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    title="Sort field"
                  >
                    <option value="title">Title</option>
                    <option value="number">Project #</option>
                    <option value="items">Items</option>
                    {#if status.title === 'Closed'}
                      <option value="closed">Closed</option>
                    {:else}
                      <option value="updated">Updated</option>
                    {/if}
                    <option value="created">Created</option>
                  </select>

                  <!-- Sort Direction dropdown -->
                  <select
                    on:change={(e) => {
                      const direction = e.currentTarget.value as SortDirection;
                      handleSortingChange(status.id, status.sort_field || 'created', direction);
                    }}
                    value="{status.sort_direction || 'desc'}"
                    class="text-xs px-2 py-1 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    title="Sort direction"
                  >
                    <option value="asc">↑ Asc</option>
                    <option value="desc">↓ Desc</option>
                  </select>
                  </div>
                </div>
              </div>

              <!-- Project Cards -->
              <div
                class="p-4 space-y-3 min-h-[200px] transition-all duration-200 {
                  dragOverColumn === status.id
                    ? status.title === 'Closed'
                      ? 'bg-red-50 border-2 border-dashed border-red-300'
                      : 'bg-blue-50 border-2 border-dashed border-blue-300'
                    : ''
                }"
                role="region"
                aria-label="Drop zone for {status.title} status"
                on:dragover={(e) => handleDragOver(e, status.id)}
                on:dragleave={(e) => handleDragLeave(e, status.id)}
                on:drop={(e) => handleDrop(e, status.id)}
              >
                {#each sortProjects(groupedProjects[status.id] || [], githubProjectsData, status).filter(project => githubProjectsData[project.id]) as project (project.id)}
                  {@const githubProject = githubProjectsData[project.id]}
                  {@const isDragging = draggedProject?.id === project.id}
                  {@const isClosedColumn = status.title === 'Closed'}
                  {@const isDropdownOpen = activeDropdownProjectId === project.id}
                    <div
                      class="bg-gray-200 rounded-lg p-3 transition-all duration-200 {isDragging ? 'opacity-50 scale-95' : 'hover:bg-gray-200 hover:shadow-md'} {!isClosedColumn && !isDropdownOpen ? 'cursor-grab active:cursor-grabbing' : ''}"
                      draggable={!isClosedColumn && !isDropdownOpen}
                      role={!isClosedColumn ? "button" : undefined}
                      aria-label={!isClosedColumn ? `Drag ${githubProject.title} to another status` : undefined}
                      tabindex={!isClosedColumn ? "0" : undefined}
                      on:dragstart={(e) => !isClosedColumn && handleDragStart(e, project)}
                      on:dragend={handleDragEnd}
                      animate:flip={{ duration: 400 }}
                    >
                      <!-- Project Title -->
                      <div class="flex-1 min-w-0">
                      <h4 class="font-medium text-gray-900 mb-1">
                        <span class="text-gray-500">#{githubProject.number}</span>
                        {' '}
                        <a
                          href={githubProject.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="hover:text-blue-600"
                          on:mousedown|stopPropagation
                          on:dragstart|preventDefault
                        >
                          {githubProject.title}
                        </a>
                      </h4>

                      <!-- Project Info -->
                      <div class="text-xs text-gray-500">
                        <span>{githubProject.items} {githubProject.items === 1 ? 'item' : 'items'}</span>
                      </div>

                        <!-- Timestamp Information -->
                        <div class="mt-1 text-xs text-gray-500 space-y-0.5">
                          {#if githubProject.isClosed && githubProject.closedAt}
                            <div>
                              Closed: <span
                                class="cursor-help underline decoration-1 decoration-gray-300"
                                on:mouseenter={(e) => showTooltip(e, formatTooltip(githubProject.closedAt))}
                                on:mouseleave={hideTooltip}
                              >{formatTimestamp(githubProject.closedAt)}</span>
                            </div>
                          {:else if githubProject.updatedAt}
                            <div>
                              Last updated: <span
                                class="cursor-help underline decoration-1 decoration-gray-300"
                                on:mouseenter={(e) => showTooltip(e, formatTooltip(githubProject.updatedAt))}
                                on:mouseleave={hideTooltip}
                              >{formatTimestamp(githubProject.updatedAt)}</span>
                            </div>
                          {/if}
                          <div>
                            Created: <span
                              class="cursor-help underline decoration-1 decoration-gray-300"
                              on:mouseenter={(e) => showTooltip(e, formatTooltip(githubProject.createdAt))}
                              on:mouseleave={hideTooltip}
                            >{formatTimestamp(githubProject.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                          <!-- Labels -->
                          <div class="mt-2">
                            <!-- Labels with inline Add Button -->
                            <div class="flex flex-wrap gap-1">
                              <!-- Current Labels -->
                              {#if project.labels && project.labels.length > 0}
                                {#each project.labels.sort((a, b) => a.title.localeCompare(b.title)) as label}
                                  <div class="flex items-center gap-1 px-2 py-1 text-xs rounded-full" style="background-color: {label.color}; color: {label.text_color || 'white'}">
                                    <button
                                      on:click|stopPropagation={() => handleEditLabel(label)}
                                      class="flex-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                                      title="Edit {label.title} label"
                                    >
                                      <span>{label.title}</span>
                                    </button>
                                    <button
                                      on:click|stopPropagation={() => handleRemoveProjectLabel(project.id, label.id)}
                                      class="hover:bg-black/20 rounded-full p-0.5 transition-colors"
                                      title="Remove {label.title} label"
                                    >
                                      <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                                      </svg>
                                    </button>
                                  </div>
                                {/each}
                              {/if}

                              <!-- Add Label Button and Dropdown -->
                              <div class="relative inline-block">
                                <!-- Add Label Button -->
                                <button
                                  on:click|stopPropagation={() => toggleLabelDropdown(project.id)}
                                  class="px-2 py-1 text-xs rounded-full border border-dashed border-gray-400 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors bg-transparent"
                                >
                                  + Add label
                                </button>

                              <!-- Dropdown -->
                              {#if activeDropdownProjectId === project.id}
                                <div class="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 cursor-default">
                                  <!-- Search Input -->
                                  <div class="p-2 border-b border-gray-100">
                                    <input
                                      bind:value={labelSearchQuery}
                                      placeholder="Filter labels..."
                                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      autofocus
                                      on:keydown={handleDropdownKeydown}
                                    />
                                  </div>

                                  <!-- Labels Container -->
                                  <div class="flex flex-col max-h-48">
                                    <!-- Scrollable Labels List -->
                                    <div class="overflow-y-auto flex-1">
                                    {#if showSearchResults}
                                      <!-- Search Results Mode with section headers -->

                                      <!-- ADDED Section in Search -->
                                      {#if addedLabelsForActiveProject.length > 0}
                                        <button
                                          on:click={toggleAddedSection}
                                          class="w-full px-3 py-1 text-xs font-normal text-gray-500 bg-gray-50 border-b border-gray-100 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                                        >
                                          <svg class="w-3 h-3 transition-transform duration-200 {addedSectionCollapsed ? '' : 'rotate-90'}" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                          </svg>
                                          <span>ADDED</span>
                                          <span class="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{addedLabelsForActiveProject.length}</span>
                                        </button>
                                        {#if !addedSectionCollapsed}
                                          {#each addedLabelsForActiveProject as label}
                                          {@const projectCount = getProjectCountForLabel(label.id)}
                                          <div class="flex items-center group">
                                            <div class="flex-1 px-3 py-2 text-left text-sm flex items-center gap-2 text-gray-500">
                                              <div class="w-3 h-3 rounded-full" style="background-color: {label.color}"></div>
                                              <span>{label.title}</span>
                                            </div>
                                            <div class="flex items-center px-2">
                                              <span class="text-gray-500" style="font-size: 10px;">{projectCount} project{projectCount === 1 ? '' : 's'}</span>
                                              <button
                                                on:click|stopPropagation={() => handleEditLabel(label)}
                                                class="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit label"
                                              >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                                </svg>
                                              </button>
                                              <button
                                                on:click|stopPropagation={() => handleDeleteLabelFromDropdown(label)}
                                                class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete label"
                                              >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                          {/each}
                                        {/if}
                                      {/if}

                                      <!-- AVAILABLE Section in Search -->
                                      {#if filteredLabelsForActiveProject.length > 0}
                                        <button
                                          on:click={toggleAvailableSection}
                                          class="w-full px-3 py-1 text-xs font-normal text-gray-500 bg-gray-50 border-b border-gray-100 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                                        >
                                          <svg class="w-3 h-3 transition-transform duration-200 {availableSectionCollapsed ? '' : 'rotate-90'}" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                          </svg>
                                          <span>AVAILABLE</span>
                                          <span class="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{filteredLabelsForActiveProject.length}</span>
                                        </button>
                                        {#if !availableSectionCollapsed}
                                          {#each filteredLabelsForActiveProject as label, index}
                                          {@const projectCount = getProjectCountForLabel(label.id)}
                                          {@const isSelected = selectedLabelIndex === index}
                                          <div
                                            class="flex items-center group {isSelected ? 'bg-gray-200' : 'hover:bg-gray-200'}"
                                            on:mouseenter={() => selectedLabelIndex = -1}
                                            data-label-index={index}
                                          >
                                            <button
                                              on:click|stopPropagation={() => handleAddLabelToProject(project.id, label.id)}
                                              class="flex-1 px-3 py-2 text-left text-sm flex items-center gap-2"
                                            >
                                              <div class="w-3 h-3 rounded-full" style="background-color: {label.color}"></div>
                                              <span>{label.title}</span>
                                            </button>
                                            <div class="flex items-center px-2">
                                              <span class="text-gray-500" style="font-size: 10px;">{projectCount} project{projectCount === 1 ? '' : 's'}</span>
                                              <button
                                                on:click|stopPropagation={() => handleEditLabel(label)}
                                                class="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit label"
                                              >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                                </svg>
                                              </button>
                                              <button
                                                on:click|stopPropagation={() => handleDeleteLabelFromDropdown(label)}
                                                class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete label"
                                              >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                          {/each}
                                        {/if}
                                      {/if}


                                      <!-- Search Empty State -->
                                      {#if addedLabelsForActiveProject.length === 0 && filteredLabelsForActiveProject.length === 0 && !newLabelFromSearch}
                                        <div class="px-3 py-4 text-sm text-gray-500 text-center">
                                          No labels found matching "{labelSearchQuery}"
                                        </div>
                                      {/if}
                                    {:else}
                                      <!-- Sectioned Mode - Show ADDED and AVAILABLE sections -->

                                      <!-- ADDED Section -->
                                      {#if addedLabelsForActiveProject.length > 0}
                                        <button
                                          on:click={toggleAddedSection}
                                          class="w-full px-3 py-1 text-xs font-normal text-gray-500 bg-gray-50 border-b border-gray-100 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                                        >
                                          <svg class="w-3 h-3 transition-transform duration-200 {addedSectionCollapsed ? '' : 'rotate-90'}" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                          </svg>
                                          <span>ADDED</span>
                                          <span class="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{addedLabelsForActiveProject.length}</span>
                                        </button>
                                        {#if !addedSectionCollapsed}
                                          {#each addedLabelsForActiveProject as label}
                                          {@const projectCount = getProjectCountForLabel(label.id)}
                                          <div class="flex items-center group">
                                            <div class="flex-1 px-3 py-2 text-left text-sm flex items-center gap-2 text-gray-500">
                                              <div class="w-3 h-3 rounded-full" style="background-color: {label.color}"></div>
                                              <span>{label.title}</span>
                                            </div>
                                            <div class="flex items-center px-2">
                                              <span class="text-gray-500" style="font-size: 10px;">{projectCount} project{projectCount === 1 ? '' : 's'}</span>
                                              <button
                                                on:click|stopPropagation={() => handleEditLabel(label)}
                                                class="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit label"
                                              >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                                </svg>
                                              </button>
                                              <button
                                                on:click|stopPropagation={() => handleDeleteLabelFromDropdown(label)}
                                                class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete label"
                                              >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                          {/each}
                                        {/if}
                                      {/if}

                                      <!-- AVAILABLE Section -->
                                      {#if filteredLabelsForActiveProject.length > 0}
                                        <button
                                          on:click={toggleAvailableSection}
                                          class="w-full px-3 py-1 text-xs font-normal text-gray-500 bg-gray-50 border-b border-gray-100 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                                        >
                                          <svg class="w-3 h-3 transition-transform duration-200 {availableSectionCollapsed ? '' : 'rotate-90'}" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                          </svg>
                                          <span>AVAILABLE</span>
                                          <span class="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{filteredLabelsForActiveProject.length}</span>
                                        </button>
                                        {#if !availableSectionCollapsed}
                                          {#each filteredLabelsForActiveProject as label, index}
                                          {@const projectCount = getProjectCountForLabel(label.id)}
                                          {@const isSelected = selectedLabelIndex === index}
                                          <div
                                            class="flex items-center group {isSelected ? 'bg-gray-200' : 'hover:bg-gray-200'}"
                                            on:mouseenter={() => selectedLabelIndex = -1}
                                            data-label-index={index}
                                          >
                                            <button
                                              on:click|stopPropagation={() => handleAddLabelToProject(project.id, label.id)}
                                              class="flex-1 px-3 py-2 text-left text-sm flex items-center gap-2"
                                            >
                                              <div class="w-3 h-3 rounded-full" style="background-color: {label.color}"></div>
                                              <span>{label.title}</span>
                                            </button>
                                            <div class="flex items-center px-2">
                                              <span class="text-gray-500" style="font-size: 10px;">{projectCount} project{projectCount === 1 ? '' : 's'}</span>
                                              <button
                                                on:click|stopPropagation={() => handleEditLabel(label)}
                                                class="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit label"
                                              >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                                </svg>
                                              </button>
                                              <button
                                                on:click|stopPropagation={() => handleDeleteLabelFromDropdown(label)}
                                                class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete label"
                                              >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                          {/each}
                                        {/if}
                                      {/if}

                                      <!-- Empty State for Sectioned Mode -->
                                      {#if addedLabelsForActiveProject.length === 0 && filteredLabelsForActiveProject.length === 0}
                                        <div class="px-3 py-4 text-sm text-gray-500 text-center">
                                          No labels available to add
                                        </div>
                                      {/if}

                                    {/if}
                                    </div>

                                    <!-- Sticky Create New Label Button (outside scroll area) -->
                                    <div class="border-t border-gray-100">
                                      <button
                                        on:click|stopPropagation={createLabelFromSearch}
                                        on:mouseenter={() => selectedLabelIndex = -1}
                                        class="w-full px-3 py-2 text-left text-sm {selectedLabelIndex === filteredLabelsForActiveProject.length ? 'bg-blue-100' : 'bg-blue-50 hover:bg-blue-100'} text-blue-600 transition-all flex items-center gap-2"
                                        data-create-label-button="true"
                                      >
                                        <span class="text-lg font-semibold">+</span>
                                        <span class="{selectedLabelIndex === filteredLabelsForActiveProject.length ? 'underline' : 'hover:underline'}">
                                          {#if labelSearchQuery.trim()}
                                            Create new label: "{labelSearchQuery.trim()}"
                                          {:else}
                                            Create new label...
                                          {/if}
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              {/if}
                              </div>
                            </div>
                          </div>
                        </div>
                {/each}

                <!-- Empty state -->
                {#if (groupedProjects[status.id] || []).length === 0}
                  <div class="text-center py-8 text-gray-500">
                    <p>No projects</p>
                    {#if status.title !== 'Closed'}
                      <p class="text-xs mt-1">Drag projects here</p>
                    {:else}
                      <p class="text-xs mt-1">Closed projects only</p>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <!-- Empty state for no statuses -->
        {#if statuses.length === 0}
          <div class="text-center py-12">
            <p class="text-gray-500 mb-4">No project statuses found</p>
            <button
              on:click={loadDashboardData}
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload
            </button>
          </div>
        {/if}
      {/if}
    {:else}
      <div class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <h2 class="text-xl font-semibold mb-4">Welcome to GitHub Projects Dashboard</h2>
          <p class="text-gray-600 mb-6">Sign in with GitHub to manage your projects</p>
          <button
            on:click={login}
            class="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 mx-auto"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clip-rule="evenodd"/>
            </svg>
            Sign in with GitHub
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Custom Tooltip -->
  {#if tooltipVisible}
    <div
      class="fixed pointer-events-none z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded shadow-lg"
      style="left: {tooltipX}px; top: {tooltipY}px;"
    >
      {tooltipText}
    </div>
  {/if}

  <!-- Label Delete Confirmation Modal -->
  <Modal
    show={showDeleteConfirmation && labelToDelete !== null}
    title="Delete Label"
    size="md"
    primaryButton={{
      text: 'Delete Label',
      variant: 'red'
    }}
    secondaryButton={{
      text: 'Cancel',
      variant: 'outline'
    }}
    on:primary={confirmDeleteLabel}
    on:secondary={cancelDeleteLabel}
    on:close={cancelDeleteLabel}
  >
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <div class="w-4 h-4 rounded-full" style="background-color: {labelToDelete?.color}"></div>
        <span class="font-semibold">{labelToDelete?.title}</span>
      </div>

      <p class="text-gray-700">
        Are you sure you want to delete this label?
      </p>

      <p class="text-sm text-gray-500">
        This label is used by <span class="font-semibold">{labelProjectCount}</span> project{labelProjectCount === 1 ? '' : 's'}
        and will be removed from {labelProjectCount === 1 ? 'it' : 'them'}.
      </p>

      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p class="text-sm text-amber-700">
          ⚠️ This action cannot be undone.
        </p>
      </div>
    </div>
  </Modal>

  <!-- Label Edit Modal -->
  <Modal
    show={showEditLabel}
    title={labelToEdit ? 'Edit Label' : 'Create Label'}
    size="md"
    primaryButton={{
      text: labelToEdit ? 'Save Changes' : 'Create Label',
      variant: 'blue',
      disabled: !editLabelTitle.trim() || isDuplicateLabelName,
      loading: editingLabel
    }}
    secondaryButton={{
      text: 'Cancel',
      variant: 'outline'
    }}
    on:primary={saveEditLabel}
    on:secondary={cancelEditLabel}
    on:close={cancelEditLabel}
  >
    <div class="space-y-4">
      <!-- Label Title Input -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Title
        </label>
        <input
          bind:value={editLabelTitle}
          placeholder="Enter label name..."
          class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 {isDuplicateLabelName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} focus:border-transparent"
          disabled={editingLabel}
        />
        {#if labelNameError}
          <p class="text-sm text-red-600 mt-1">{labelNameError}</p>
        {/if}
      </div>

      <!-- Color Picker -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Colour
        </label>
        <div class="flex items-center gap-1">
          <input
            type="color"
            bind:value={editLabelColor}
            on:input={() => justOpenedEditModal = false}
            class="sr-only"
            disabled={editingLabel}
            id="colorPicker"
          />
          <label
            for="colorPicker"
            class="flex-1 flex items-center gap-2 px-3 py-2 rounded-full text-sm cursor-pointer"
            style="background-color: {editLabelColor}; color: {editLabelTextColor}"
          >
            <span>{editLabelTitle || 'Preview'}</span>
          </label>
          <label
            for="colorPicker"
            class="p-2 rounded-lg cursor-pointer text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
            </svg>
          </label>
        </div>
      </div>

      <!-- Text Color Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Text Colour
        </label>
        <div class="flex items-center gap-3">
          <!-- Black Label Preview -->
          <span class="px-3 py-1 text-sm font-bold rounded-full text-black bg-gray-100">Black</span>

          <!-- Toggle Switch -->
          <button
            type="button"
            on:click={() => handleTextColorChange(editLabelTextColor === 'white' ? 'black' : 'white')}
            disabled={editingLabel}
            class="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span class="sr-only">Toggle text color</span>
            <span class="inline-block h-4 w-4 transform rounded-full bg-gray-600 transition-transform {editLabelTextColor === 'white' ? 'translate-x-6' : 'translate-x-1'} shadow-sm"></span>
          </button>

          <!-- White Label Preview -->
          <span class="px-3 py-1 text-sm font-bold rounded-full text-white bg-black">White</span>
        </div>
      </div>
    </div>
  </Modal>

  <!-- Create Column Modal -->
  <Modal
    show={showCreateColumn}
    title="Create New Column"
    size="md"
    primaryButton={{
      text: 'Create Column',
      variant: 'blue',
      disabled: !newColumnTitle.trim() || isDuplicateNewColumnName,
      loading: creatingColumn
    }}
    secondaryButton={{
      text: 'Cancel',
      variant: 'outline'
    }}
    on:primary={handleCreateColumn}
    on:secondary={() => { showCreateColumn = false; newColumnTitle = ''; insertAfterStatusId = null; }}
    on:close={() => { showCreateColumn = false; newColumnTitle = ''; insertAfterStatusId = null; }}
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Column Name
        </label>
        <input
          bind:value={newColumnTitle}
          placeholder="Enter column name..."
          class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 {isDuplicateNewColumnName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} focus:border-transparent"
          autofocus
          on:keydown={(e) => {
            if (e.key === 'Enter' && newColumnTitle.trim() && !creatingColumn && !isDuplicateNewColumnName) {
              handleCreateColumn();
            }
          }}
        />
        {#if newColumnNameError}
          <p class="text-red-600 text-sm mt-1">{newColumnNameError}</p>
        {/if}
      </div>

      <div class="text-sm text-gray-500">
        {#if insertAfterStatusId}
          {@const afterStatus = statuses.find(s => s.id === insertAfterStatusId)}
          The new column will be created to the right of the "{afterStatus?.title || 'Unknown'}" column.
        {:else}
          The new column will be created to the left of the "Closed" column.
        {/if}
      </div>
    </div>
  </Modal>

  <!-- Delete Column Confirmation Modal -->
  <Modal
    show={showDeleteColumn && statusToDelete !== null}
    title="Delete Column"
    size="md"
    primaryButton={{
      text: 'Delete Column',
      variant: 'red',
      loading: deletingColumn
    }}
    secondaryButton={{
      text: 'Cancel',
      variant: 'outline'
    }}
    on:primary={confirmDeleteColumn}
    on:secondary={cancelDeleteColumn}
    on:close={cancelDeleteColumn}
  >
    <div class="space-y-4">
      <p class="text-gray-700">
        Are you sure you want to delete the "<strong>{statusToDelete?.title}</strong>" column?
      </p>

      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p class="text-sm text-amber-700">
          ⚠️ All projects in this column will be moved to "No Status". This action cannot be undone.
        </p>
      </div>
    </div>
  </Modal>

  <!-- Edit Column Modal -->
  <Modal
    show={showEditColumn}
    title="Edit Column"
    size="md"
    primaryButton={{
      text: 'Save Changes',
      variant: 'blue',
      disabled: !editColumnTitle.trim() || isDuplicateEditColumnName,
      loading: editingColumn
    }}
    secondaryButton={{
      text: 'Cancel',
      variant: 'outline'
    }}
    on:primary={handleEditColumn}
    on:secondary={cancelEditColumn}
    on:close={cancelEditColumn}
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Column Name
        </label>
        <input
          bind:value={editColumnTitle}
          placeholder="Enter column name..."
          class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 {isDuplicateEditColumnName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} focus:border-transparent"
          autofocus
          on:keydown={(e) => {
            if (e.key === 'Enter' && editColumnTitle.trim() && !editingColumn && !isDuplicateEditColumnName) {
              handleEditColumn();
            }
          }}
        />
        {#if editColumnNameError}
          <p class="text-red-600 text-sm mt-1">{editColumnNameError}</p>
        {/if}
      </div>
    </div>
  </Modal>
</main>
