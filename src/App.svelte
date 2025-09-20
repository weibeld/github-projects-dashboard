<script lang='ts'>
  import { onMount } from 'svelte';
  import { flip } from 'svelte/animate';
  import {
    login,
    logout,
    isLoggedIn,
    isLoggingIn,
    isLoggingOut,
    initializeAuth,
    githubProjects,
    sortProjects
  } from './lib/business';
  import type { Column, Project, Label, SortField, SortDirection, GitHubProject } from './lib/business/types';
  import { SORT_FIELD_LABELS, SORT_DIRECTION_LABELS } from './lib/business/types';
  import Modal from './components/Modal.svelte';
  import ButtonFrameless from './components/ButtonFrameless.svelte';
  import ButtonFramed from './components/ButtonFramed.svelte';
  import InputField from './components/InputField.svelte';
  import Tooltip from './components/Tooltip.svelte';
  import { CaseSensitive, Hash, ListOrdered, CalendarSync, CalendarPlus, CalendarX2, ArrowUpNarrowWide, ArrowUpWideNarrow, ArrowDownWideNarrow, ArrowDownNarrowWide, Trash2, Pencil, Plus, ArrowRight, ArrowLeft, X, ChevronRight, Loader, Search } from 'lucide-svelte';

  // Import extracted utilities and actions
  import { formatTimestamp, formatTooltip } from './lib/utils/dateFormatting';
  import { getOptimalTextColor, toggleTextColor } from './lib/utils/colorUtils';
  import { filterProjects } from './lib/utils/searchUtils';
  import { loadDashboardData } from './lib/utils/dataLoader';
  import { isDuplicateLabelName, isDuplicateColumnName } from './lib/utils/validation';

  // Import mock mode utilities
  import { isMockMode } from './lib/base/mockMode';
  import { initTestModeAuth } from '../tests/helpers';

  // Import UI state stores
  import {
    activeDropdownProjectId,
    labelSearchQuery,
    newLabelFromSearch,
    selectedLabelIndex,
    activeSortFieldDropdown,
    selectedSortFieldIndex,
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
    showCreateColumn,
    newColumnTitle,
    creatingColumn,
    insertAfterColumnId,
    showDeleteColumn,
    columnToDelete,
    deletingColumn,
    showEditColumn,
    columnToEdit,
    editColumnTitle,
    editingColumn,
    justOpenedEditModal,
    searchQuery
  } from './lib/utils/ui/uiState';

  // Import business functions
  import {
    createColumn,
    deleteColumn,
    updateColumnTitle,
    moveColumnLeft,
    moveColumnRight,
    canMoveLeft,
    canMoveRight,
    updateColumnSortField,
    updateColumnSortDirection,
    createLabel,
    deleteLabel,
    addLabelToProject,
    removeLabelFromProject,
    getFilteredLabels,
    getProjectCountForLabel
  } from './lib/business';

  // Import drag and drop functionality
  import {
    draggedProject,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } from './lib/utils/ui/dragDrop';

  // Import keyboard navigation
  import {
    handleDropdownKeydown,
    handleSortFieldKeydown
  } from './lib/utils/ui/keyboard';

  let columns: Column[] = [];
  let projects: Project[] = [];
  let labels: Label[] = [];
  let githubProjectsMap: Record<string, GitHubProject> = {};
  let loading = false;
  let error = '';
  let filteredProjects: Project[] = [];

  // Authentication state that considers test mode
  $: isAuthenticated = isTestMode() || $isLoggedIn;

  // Create store wrappers for arrays
  const columnsStore = { set: (value: Column[]) => { columns = value; } };
  const projectsStore = { set: (value: Project[]) => { projects = value; } };
  const labelsStore = { set: (value: Label[]) => { labels = value; } };

  // Reactive filtered labels for the active dropdown
  $: filteredLabelsForActiveProject = (() => {
    if (!$activeDropdownProjectId || !labels || !projects) return [];

    const projectLabelIds = new Set(projects.find(p => p.id === $activeDropdownProjectId)?.labels?.map(l => l.id) || []);
    let availableLabels = labels.filter(l => !projectLabelIds.has(l.id));

    if ($labelSearchQuery.trim()) {
      availableLabels = availableLabels.filter(l =>
        l.title.toLowerCase().includes($labelSearchQuery.toLowerCase())
      );
    }

    return availableLabels;
  })();

  // Reactive added labels for the active dropdown (filtered by search)
  $: addedLabelsForActiveProject = (() => {
    if (!$activeDropdownProjectId || !labels || !projects) return [];

    const project = projects.find(p => p.id === $activeDropdownProjectId);
    if (!project || !project.labels) return [];

    let addedLabels = project.labels;

    if ($labelSearchQuery.trim()) {
      addedLabels = addedLabels.filter(l =>
        l.title.toLowerCase().includes($labelSearchQuery.toLowerCase())
      );
    }

    return addedLabels;
  })();

  // Check if we should show search results (when there's a search query)
  $: showSearchResults = $labelSearchQuery.trim().length > 0;

  // Update newLabelFromSearch based on search query and filtered results
  $: {
    if ($activeDropdownProjectId && $labelSearchQuery.trim()) {
      const query = $labelSearchQuery.trim();
      const allMatchingLabels = [...filteredLabelsForActiveProject, ...addedLabelsForActiveProject];

      // If query doesn't match any existing labels (available or added), set it as potential new label
      if (!allMatchingLabels.some(l => l.title.toLowerCase() === query.toLowerCase())) {
        newLabelFromSearch.set(query);
      } else {
        newLabelFromSearch.set('');
      }
    } else {
      newLabelFromSearch.set('');
    }

    // Auto-select first item when search query changes (but not when empty)
    if ($activeDropdownProjectId && $labelSearchQuery.trim()) {
      if (filteredLabelsForActiveProject.length > 0) {
        // Focus on first available label
        selectedLabelIndex.set(0);
      } else {
        // No labels available, focus on "Create new label" button
        selectedLabelIndex.set(0); // This will be the "Create new label" button index
      }
    } else {
      selectedLabelIndex.set(-1);
    }
  }

  // Label name duplicate validation
  $: isDuplicateLabelNameResult = isDuplicateLabelName(
    $editLabelTitle,
    labels,
    $labelToEdit?.id
  );

  // Column name duplicate validation (for creating new columns)
  $: isDuplicateNewColumnNameResult = isDuplicateColumnName(
    $newColumnTitle,
    columns
  );

  // Column name duplicate validation (for editing existing columns)
  $: isDuplicateEditColumnNameResult = isDuplicateColumnName(
    $editColumnTitle,
    columns,
    $columnToEdit?.id
  );

  // Always automatically calculate optimal text color when background color changes
  // Exception: preserve existing text color when initially opening Edit Label modal
  $: if ($editLabelColor && !$justOpenedEditModal) {
    editLabelTextColor.set(getOptimalTextColor($editLabelColor));
  }


  // Subscribe to GitHub projects data from store
  $: githubProjectsMap = $githubProjects;


  // Apply search filtering using extracted utility
  $: filteredProjects = filterProjects($searchQuery, projects, githubProjectsMap);

  // Reactive grouped projects - recomputed whenever filteredProjects or columns change
  $: groupedProjects = columns.reduce((acc, column) => {
    acc[column.id] = filteredProjects
      .filter(p => p.column_id === column.id)
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {} as Record<string, Project[]>);


  onMount(() => {

    // Check if we're in mock mode
    const mockModeActive = isMockMode();

    if (mockModeActive) {
      // Initialize mock mode authentication
      initTestModeAuth();
    } else {
      // Normal authentication flow
      setupAuth();
    }

    // Unified data loading logic for both test and normal modes
    isLoggedIn.subscribe(async (loggedIn) => {
      if (loggedIn) {
        loading = true;
        error = '';

        try {
          const result = await loadDashboardData();
          columns = result.columns;
          projects = result.projects;
          labels = result.labels;
        } catch (err) {
          error = err instanceof Error ? err.message : 'Failed to load data';
          console.error('Dashboard error:', err);
        } finally {
          loading = false;
        }
      }
    });

    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      error = 'Something went wrong. Please try again.';
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Handle click outside to close label dropdown and sort dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      if ($activeDropdownProjectId && !target?.closest('.relative')) {
        closeLabelDropdown();
      }

      // Close sort dropdowns when clicking outside
      if ($activeSortFieldDropdown && !target?.closest('.relative')) {
        activeSortFieldDropdown.set(null);
        selectedSortFieldIndex.set(-1);
      }
    };
    document.addEventListener('click', handleClickOutside);

    // Handle keyboard events for modals and dropdowns
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if ($showDeleteConfirmation) {
          cancelDeleteLabel();
        } else if ($showEditLabel) {
          cancelEditLabel();
        } else if ($activeSortFieldDropdown) {
          activeSortFieldDropdown.set(null);
          selectedSortFieldIndex.set(-1);
        }
      } else if ($activeSortFieldDropdown) {
        handleSortFieldKeydown(event, $activeSortFieldDropdown, columns, columnsStore);
      }
    };
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  });
</script>

<main class="min-h-screen _bg-white">
  <!-- Header -->
  <div class="_bg-gray-light">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold _text-black">GitHub Projects Dashboard</h1>
      {#if isAuthenticated}
        <ButtonFramed
          variant="red"
          loading={$isLoggingOut}
          loadingText="Logging out..."
          on:click={logout}
        >
          Logout
        </ButtonFramed>
      {/if}
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="px-4 py-8 mx-auto">
    {#if isAuthenticated}
      {#if loading}
        <div class="flex items-center justify-center min-h-[400px]">
          <div class="text-center">
            <div class="flex justify-center mb-4 _text-black">
              <Loader size={32} class="animate-spin" />
            </div>
            <p class="_text-regular _text-gray-black">Loading your GitHub Projects...</p>
          </div>
        </div>
      {:else if error}
        <div class="_bg-red-light border _border-red rounded-lg p-4 mb-6">
          <p class="_text-regular _text-red">Error: {error}</p>
          <ButtonFramed
            variant="red"
            class="mt-2"
            on:click={loadDashboardData}
          >
            Retry
          </ButtonFramed>
        </div>
      {:else}

        <!-- Search Bar -->
        <div class="mb-6">
          <div class="_bg-white p-4">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0 _icon-normal _text-gray">
                <Search />
              </div>
              <InputField
                bind:value={$searchQuery}
                placeholder="Search projects... (e.g., &quot;app&quot;, &quot;label:frontend&quot;, &quot;updated:>1 month ago&quot;)"
                class="flex-1"
              />
              {#if $searchQuery}
                <ButtonFrameless
                  variant="red"
                  title="Clear search"
                  on:click={() => searchQuery.set('')}
                >
                  <X class="_icon-normal" />
                </ButtonFrameless>
              {/if}
            </div>


            <!-- Results Summary -->
            {#if $searchQuery}
              <div class="mt-3 _text-regular _text-gray-black">
                Showing {filteredProjects.length} of {projects.length} projects
                {#if filteredProjects.length !== projects.length}
                  <span class="ml-2 px-2 py-1 _bg-blue-light _text-blue rounded-full _text-small">
                    {projects.length - filteredProjects.length} hidden
                  </span>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <!-- Project Dashboard -->
        <div class="overflow-x-auto">
          <div class="flex gap-6 min-w-full w-max pb-4 justify-center">
            {#each columns as column (column.id)}
              <div
                class="_bg-gray-light rounded-lg shadow transition-all duration-200 flex-shrink-0"
                style="width: 380px;"
                animate:flip={{ duration: 300 }}
                data-testid="column"
              >
              <!-- Column Header -->
              <div class="px-4 py-3 border-b _border-gray-light">
                <!-- Top line: Title and action buttons -->
                <div class="flex items-center justify-between mb-2">
                  <div>
                    {#if column.is_system}
                      <h3 class="_text-regular font-semibold _text-black">{column.title}</h3>
                    {:else}
                      <button
                        on:click={() => showEditColumnModal(column)}
                        class="_text-regular font-semibold _text-black cursor-pointer text-left"
                        title="Click to edit column title"
                      >
                        {column.title}
                      </button>
                    {/if}
                  </div>
                  <div class="flex items-center gap-1">
                    <!-- Arrow buttons for reordering (only for non-system columns) -->
                    {#if !column.is_system}
                      <!-- Left arrow -->
                      <ButtonFrameless
                        variant="blue"
                        disabled={!canMoveLeft(column, columns)}
                        title="Move column to the left"
                        on:click={() => moveColumnLeft(column, columns, columnsStore)}
                      >
                        <ArrowLeft class="_icon-normal" />
                      </ButtonFrameless>

                      <!-- Right arrow -->
                      <ButtonFrameless
                        variant="blue"
                        disabled={!canMoveRight(column, columns)}
                        title="Move column to the right"
                        on:click={() => moveColumnRight(column, columns, columnsStore)}
                      >
                        <ArrowRight class="_icon-normal" />
                      </ButtonFrameless>
                    {/if}


                    <!-- Add Column button (not for Closed column) -->
                    {#if column.title !== 'Closed'}
                      <ButtonFrameless
                        variant="blue"
                        title="Add new column to the right"
                        on:click={() => {
                          insertAfterColumnId.set(column.id);
                          showCreateColumn.set(true);
                        }}
                      >
                        <Plus class="_icon-normal" />
                      </ButtonFrameless>
                    {/if}

                    <!-- Delete button (only for non-system columns) -->
                    {#if !column.is_system}
                      <ButtonFrameless
                        variant="red"
                        title="Delete column"
                        on:click={() => showDeleteColumnConfirmation(column)}
                      >
                        <Trash2 class="_icon-normal" />
                      </ButtonFrameless>
                    {/if}
                  </div>
                </div>

                <!-- Bottom line: Project count and sorting controls -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <span class="px-2 py-1 _bg-gray-regular _text-gray-black font-bold rounded-full _text-small">
                      {(groupedProjects[column.id] || []).length}
                    </span>
                  </div>
                  <div class="flex items-center">
                  <!-- Sort Field dropdown -->
                  <div class="relative">
                    <ButtonFrameless
                      variant="blue"
                      title="Sort by"
                      on:click={() => {
                        if ($activeSortFieldDropdown === column.id) {
                          activeSortFieldDropdown.set(null);
                        } else {
                          activeSortFieldDropdown.set(column.id);
                          selectedSortFieldIndex.set(-1);
                        }
                      }}
                    >
                      <div class="flex items-center gap-1 _text-small">
                        <!-- Display appropriate icon based on current sort field -->
                        {#if (column.sort_field || 'updatedAt') === 'title'}
                          <CaseSensitive class="_icon-normal" />
                          {SORT_FIELD_LABELS.title.toUpperCase()}
                        {:else if (column.sort_field || 'updatedAt') === 'number'}
                          <Hash class="_icon-normal" />
                          {SORT_FIELD_LABELS.number.toUpperCase()}
                        {:else if (column.sort_field || 'updatedAt') === 'items'}
                          <ListOrdered class="_icon-normal" />
                          {SORT_FIELD_LABELS.items.toUpperCase()}
                        {:else if (column.sort_field || 'updatedAt') === 'updatedAt'}
                          <CalendarSync class="_icon-normal" />
                          {SORT_FIELD_LABELS.updatedAt.toUpperCase()}
                        {:else if (column.sort_field || 'updatedAt') === 'closedAt'}
                          <CalendarX2 class="_icon-normal" />
                          {SORT_FIELD_LABELS.closedAt.toUpperCase()}
                        {:else}
                          <CalendarPlus class="_icon-normal" />
                          {SORT_FIELD_LABELS.createdAt.toUpperCase()}
                        {/if}
                      </div>
                    </ButtonFrameless>

                    {#if $activeSortFieldDropdown === column.id}
                      <div
                        class="absolute left-0 top-full mt-1 w-36 bg-white border _border-gray-light rounded-lg shadow-lg z-50"
                      >
                        <button
                          on:click={() => {
                            handleSortingChange(column.id, 'title', column.sort_direction || 'desc', columns, columnsStore);
                            activeSortFieldDropdown.set(null);
                            selectedSortFieldIndex.set(-1);
                          }}
                          on:mouseenter={() => selectedSortFieldIndex.set(-1)}
                          class="w-full px-3 py-2 _text-small text-left first:rounded-t-lg flex items-center gap-2 focus:outline-none transition-colors {$selectedSortFieldIndex === 0 ? '_dropdown-item-highlight' : '_text-gray-button hover:_dropdown-item-highlight'}"
                        >
                          <CaseSensitive class="_icon-normal" />
                          {SORT_FIELD_LABELS.title.toUpperCase()}
                        </button>
                        <button
                          on:click={() => {
                            handleSortingChange(column.id, 'number', column.sort_direction || 'desc', columns, columnsStore);
                            activeSortFieldDropdown.set(null);
                            selectedSortFieldIndex.set(-1);
                          }}
                          on:mouseenter={() => selectedSortFieldIndex.set(-1)}
                          class="w-full px-3 py-2 _text-small text-left flex items-center gap-2 focus:outline-none transition-colors {$selectedSortFieldIndex === 1 ? '_dropdown-item-highlight' : '_text-gray-button hover:_dropdown-item-highlight'}"
                        >
                          <Hash class="_icon-normal" />
                          {SORT_FIELD_LABELS.number.toUpperCase()}
                        </button>
                        <button
                          on:click={() => {
                            handleSortingChange(column.id, 'items', column.sort_direction || 'desc', columns, columnsStore);
                            activeSortFieldDropdown.set(null);
                            selectedSortFieldIndex.set(-1);
                          }}
                          on:mouseenter={() => selectedSortFieldIndex.set(-1)}
                          class="w-full px-3 py-2 _text-small text-left flex items-center gap-2 focus:outline-none transition-colors {$selectedSortFieldIndex === 2 ? '_dropdown-item-highlight' : '_text-gray-button hover:_dropdown-item-highlight'}"
                        >
                          <ListOrdered class="_icon-normal" />
                          {SORT_FIELD_LABELS.items.toUpperCase()}
                        </button>
                        <button
                          on:click={() => {
                            handleSortingChange(column.id, 'updatedAt', column.sort_direction || 'desc', columns, columnsStore);
                            activeSortFieldDropdown.set(null);
                            selectedSortFieldIndex.set(-1);
                          }}
                          on:mouseenter={() => selectedSortFieldIndex.set(-1)}
                          class="w-full px-3 py-2 _text-small text-left flex items-center gap-2 focus:outline-none transition-colors {$selectedSortFieldIndex === 3 ? '_dropdown-item-highlight' : '_text-gray-button hover:_dropdown-item-highlight'}"
                        >
                          <CalendarSync class="_icon-normal" />
                          {SORT_FIELD_LABELS.updatedAt.toUpperCase()}
                        </button>
                        <button
                          on:click={() => {
                            handleSortingChange(column.id, 'createdAt', column.sort_direction || 'desc', columns, columnsStore);
                            activeSortFieldDropdown.set(null);
                            selectedSortFieldIndex.set(-1);
                          }}
                          on:mouseenter={() => selectedSortFieldIndex.set(-1)}
                          class="w-full px-3 py-2 _text-small text-left {column.title === 'Closed' ? '' : 'last:rounded-b-lg'} flex items-center gap-2 focus:outline-none transition-colors {$selectedSortFieldIndex === 4 ? '_dropdown-item-highlight' : '_text-gray-button hover:_dropdown-item-highlight'}"
                        >
                          <CalendarPlus class="_icon-normal" />
                          {SORT_FIELD_LABELS.createdAt.toUpperCase()}
                        </button>
                        {#if column.title === 'Closed'}
                          <button
                            on:click={() => {
                              handleSortingChange(column.id, 'closedAt', column.sort_direction || 'desc', columns, columnsStore);
                              activeSortFieldDropdown.set(null);
                              selectedSortFieldIndex.set(-1);
                            }}
                            on:mouseenter={() => selectedSortFieldIndex.set(-1)}
                            class="w-full px-3 py-2 _text-small text-left last:rounded-b-lg flex items-center gap-2 focus:outline-none transition-colors {$selectedSortFieldIndex === 5 ? '_dropdown-item-highlight' : '_text-gray-button hover:_dropdown-item-highlight'}"
                          >
                            <CalendarX2 class="_icon-normal" />
                            {SORT_FIELD_LABELS.closedAt.toUpperCase()}
                          </button>
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <!-- Sort Direction toggle -->
                  <ButtonFrameless
                    variant="blue"
                                        title="Sort direction"
                    on:click={() => {
                      const newDirection = column.sort_direction === 'asc' ? 'desc' : 'asc';
                      handleSortingChange(column.id, column.sort_field || 'updatedAt', newDirection, columns, columnsStore);
                    }}
                  >
                    <div class="flex items-center gap-1 _text-small">
                      {#if column.sort_direction === 'asc'}
                        <ArrowUpNarrowWide class="_icon-normal" />
                        {SORT_DIRECTION_LABELS.asc.toUpperCase()}
                      {:else}
                        <ArrowDownWideNarrow class="_icon-normal" />
                        {SORT_DIRECTION_LABELS.desc.toUpperCase()}
                      {/if}
                    </div>
                  </ButtonFrameless>
                  </div>
                </div>
              </div>

              <!-- Project Cards -->
              <div
                class="p-4 space-y-3 min-h-[200px] transition-all duration-200 {
                  $dragOverColumn === column.id
                    ? column.title === 'Closed'
                      ? '_bg-red-light border-2 border-dashed _border-red'
                      : '_bg-blue-light border-2 border-dashed _border-blue'
                    : ''
                }"
                role="region"
                aria-label="Drop zone for {column.title} column"
                on:dragover={(e) => handleDragOver(e, column.id, columns)}
                on:dragleave={(e) => handleDragLeave(e, column.id)}
                on:drop={(e) => handleDrop(e, column.id, columns, groupedProjects, projects, projectsStore)}
              >
                {#each sortProjects(groupedProjects[column.id] || [], githubProjectsMap, column).filter(project => githubProjectsMap[project.id]) as project (project.id)}
                  {@const githubProject = githubProjectsMap[project.id]}
                  {@const isDragging = $draggedProject?.id === project.id}
                  {@const isClosedColumn = column.title === 'Closed'}
                  {@const isDropdownOpen = $activeDropdownProjectId === project.id}
                    <div
                      class="_bg-white rounded-lg p-3 transition-all duration-200 {isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'} {!isClosedColumn && !isDropdownOpen ? 'cursor-grab active:cursor-grabbing' : ''}"
                      draggable={!isClosedColumn && !isDropdownOpen}
                      role={!isClosedColumn ? "button" : undefined}
                      aria-label={!isClosedColumn ? `Drag ${githubProject.title} to another column` : undefined}
                      tabindex={!isClosedColumn ? "0" : undefined}
                      on:dragstart={(e) => !isClosedColumn && handleDragStart(e, project)}
                      on:dragend={handleDragEnd}
                      animate:flip={{ duration: 400 }}
                      data-testid="project-card"
                    >
                      <!-- Project Title -->
                      <div class="flex-1 min-w-0">
                      <h4 class="_text-regular font-medium _text-black mb-1">
                        <span class="_text-regular _text-gray">#{githubProject.number}</span>
                        {' '}
                        <a
                          href={githubProject.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="_text-regular _text-link-hover"
                          on:mousedown|stopPropagation
                          on:dragstart|preventDefault
                        >
                          {githubProject.title}
                        </a>
                      </h4>

                      <!-- Project Info -->
                      <div class="_text-small _text-gray">
                        <span>{githubProject.items} {githubProject.items === 1 ? 'item' : 'items'}</span>
                      </div>

                        <!-- Timestamp Information -->
                        <div class="mt-1 _text-small _text-gray space-y-0.5">
                          {#if githubProject.isClosed && githubProject.closedAt}
                            <div>
                              Closed: <Tooltip text={formatTooltip(githubProject.closedAt)} speed="fast">
                                <span class="cursor-pointer underline decoration-1 decoration-gray-300">
                                  {formatTimestamp(githubProject.closedAt)}
                                </span>
                              </Tooltip>
                            </div>
                          {:else if githubProject.updatedAt}
                            <div>
                              Last updated: <Tooltip text={formatTooltip(githubProject.updatedAt)} speed="fast">
                                <span class="cursor-pointer underline decoration-1 decoration-gray-300">
                                  {formatTimestamp(githubProject.updatedAt)}
                                </span>
                              </Tooltip>
                            </div>
                          {/if}
                          <div>
                            Created: <Tooltip text={formatTooltip(githubProject.createdAt)} speed="fast">
                              <span class="cursor-pointer underline decoration-1 decoration-gray-300">
                                {formatTimestamp(githubProject.createdAt)}
                              </span>
                            </Tooltip>
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
                                  <div class="flex items-center gap-1 px-2 py-1 _text-small rounded-full {label.text_color === 'black' ? '_text-black' : '_text-white'}" style="background-color: {label.color}">
                                    <button
                                      on:click|stopPropagation={() => { handleEditLabel(label); justOpenedEditModal.set(true); }}
                                      class="flex-1 _text-small text-left hover:opacity-80 transition-opacity cursor-pointer"
                                      title="Edit {label.title} label"
                                    >
                                      <span>{label.title}</span>
                                    </button>
                                    <button
                                      on:click|stopPropagation={() => handleRemoveProjectLabel(project.id, label.id, projectsStore)}
                                      class="hover:bg-black/20 rounded-full p-0.5 transition-colors"
                                      title="Remove {label.title} label"
                                    >
                                      <X class="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                {/each}
                              {/if}

                              <!-- Add Label Button and Dropdown -->
                              <div class="relative inline-block">
                                <!-- Add Label Button -->
                                <button
                                  on:click|stopPropagation={() => toggleLabelDropdown(project.id)}
                                  class="px-2 py-1 _text-small rounded-full border border-dashed _border-gray-regular _text-gray-black hover:_border-gray-regular hover:_text-black transition-colors bg-transparent"
                                >
                                  + Add label
                                </button>

                              <!-- Dropdown -->
{#if $activeDropdownProjectId === project.id}
                                <div class="absolute left-0 top-full mt-1 w-64 bg-white border _border-gray-light rounded-lg shadow-lg z-50 cursor-default">
                                  <!-- Search Input -->
                                  <div class="p-2 border-b _border-gray-light">
                                    <InputField
                                      bind:value={$labelSearchQuery}
                                      placeholder="Filter labels..."
                                      size="small"
                                      autofocus
                                      on:keydown={(e) => handleDropdownKeydown(e, filteredLabelsForActiveProject, projectsStore)}
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
                                          class="w-full px-3 py-1 _text-small font-normal _text-gray _bg-gray-light border-b _border-gray-light flex items-center gap-2 hover:_bg-gray-regular transition-colors"
                                        >
                                          <ChevronRight class="w-5 h-5 transition-transform duration-200 {$addedSectionCollapsed ? '' : 'rotate-90'}" />
                                          <span class="_text-small">ADDED</span>
                                          <span class="_bg-gray-regular _text-gray-black px-1.5 py-0.5 rounded-full _text-small">{addedLabelsForActiveProject.length}</span>
                                        </button>
                                        {#if !$addedSectionCollapsed}
                                          {#each addedLabelsForActiveProject as label}
                                          {@const projectCount = getProjectCountForLabel(label.id, projects)}
                                          <div class="flex items-center group">
                                            <div class="flex-1 px-3 py-2 text-left _text-regular-small flex items-center gap-2 _text-gray">
                                              <div class="w-5 h-5 rounded-full" style="background-color: {label.color}"></div>
                                              <span>{label.title}</span>
                                            </div>
                                            <div class="flex items-center px-2">
                                              <span class="_text-gray" style="font-size: 10px;">{projectCount} project{projectCount === 1 ? '' : 's'}</span>
                                              <ButtonFrameless
                                                variant="blue"
                                                title="Edit label"
                                                on:click={(e) => { e.stopPropagation(); handleEditLabel(label); justOpenedEditModal.set(true); }}
                                              >
                                                <Pencil class="_icon-small" />
                                              </ButtonFrameless>
                                              <ButtonFrameless
                                                variant="red"
                                                title="Delete label"
                                                on:click={(e) => { e.stopPropagation(); handleDeleteLabelFromDropdown(label, projects, labelsStore, projectsStore); }}
                                              >
                                                <Trash2 class="_icon-small" />
                                              </ButtonFrameless>
                                            </div>
                                          </div>
                                          {/each}
                                        {/if}
                                      {/if}

                                      <!-- AVAILABLE Section in Search -->
                                      {#if filteredLabelsForActiveProject.length > 0}
                                        <button
                                          on:click={toggleAvailableSection}
                                          class="w-full px-3 py-1 _text-small font-normal _text-gray _bg-gray-light border-b _border-gray-light flex items-center gap-2 hover:_bg-gray-regular transition-colors"
                                        >
                                          <ChevronRight class="w-5 h-5 transition-transform duration-200 {$availableSectionCollapsed ? '' : 'rotate-90'}" />
                                          <span class="_text-small">AVAILABLE</span>
                                          <span class="_bg-gray-regular _text-gray-black px-1.5 py-0.5 rounded-full _text-small">{filteredLabelsForActiveProject.length}</span>
                                        </button>
                                        {#if !$availableSectionCollapsed}
                                          {#each filteredLabelsForActiveProject as label, index}
                                          {@const projectCount = getProjectCountForLabel(label.id, projects)}
                                          {@const isSelected = $selectedLabelIndex === index}
                                          <div
                                            class="flex items-center group {isSelected ? '_dropdown-item-highlight' : 'hover:_dropdown-item-highlight'}"
                                            on:mouseenter={() => selectedLabelIndex.set(-1)}
                                            data-label-index={index}
                                          >
                                            <button
                                              on:click|stopPropagation={() => handleAddLabelToProject(project.id, label.id, projectsStore)}
                                              class="flex-1 px-3 py-2 text-left _text-regular-small flex items-center gap-2"
                                            >
                                              <div class="w-5 h-5 rounded-full" style="background-color: {label.color}"></div>
                                              <span>{label.title}</span>
                                            </button>
                                            <div class="flex items-center px-2">
                                              <span class="_text-gray" style="font-size: 10px;">{projectCount} project{projectCount === 1 ? '' : 's'}</span>
                                              <ButtonFrameless
                                                variant="blue"
                                                title="Edit label"
                                                on:click={(e) => { e.stopPropagation(); handleEditLabel(label); justOpenedEditModal.set(true); }}
                                              >
                                                <Pencil class="_icon-small" />
                                              </ButtonFrameless>
                                              <ButtonFrameless
                                                variant="red"
                                                title="Delete label"
                                                on:click={(e) => { e.stopPropagation(); handleDeleteLabelFromDropdown(label, projects, labelsStore, projectsStore); }}
                                              >
                                                <Trash2 class="_icon-small" />
                                              </ButtonFrameless>
                                            </div>
                                          </div>
                                          {/each}
                                        {/if}
                                      {/if}


                                      <!-- Search Empty State -->
                                      {#if addedLabelsForActiveProject.length === 0 && filteredLabelsForActiveProject.length === 0 && !newLabelFromSearch}
                                        <div class="px-3 py-4 _text-regular-small _text-gray text-center">
                                          No labels found matching "{labelSearchQuery}"
                                        </div>
                                      {/if}
                                    {:else}
                                      <!-- Sectioned Mode - Show ADDED and AVAILABLE sections -->

                                      <!-- ADDED Section -->
                                      {#if addedLabelsForActiveProject.length > 0}
                                        <button
                                          on:click={toggleAddedSection}
                                          class="w-full px-3 py-1 _text-small font-normal _text-gray _bg-gray-light border-b _border-gray-light flex items-center gap-2 hover:_bg-gray-regular transition-colors"
                                        >
                                          <ChevronRight class="w-5 h-5 transition-transform duration-200 {$addedSectionCollapsed ? '' : 'rotate-90'}" />
                                          <span class="_text-small">ADDED</span>
                                          <span class="_bg-gray-regular _text-gray-black px-1.5 py-0.5 rounded-full _text-small">{addedLabelsForActiveProject.length}</span>
                                        </button>
                                        {#if !$addedSectionCollapsed}
                                          {#each addedLabelsForActiveProject as label}
                                          {@const projectCount = getProjectCountForLabel(label.id, projects)}
                                          <div class="flex items-center group">
                                            <div class="flex-1 px-3 py-2 text-left _text-regular-small flex items-center gap-2 _text-gray">
                                              <div class="w-5 h-5 rounded-full" style="background-color: {label.color}"></div>
                                              <span>{label.title}</span>
                                            </div>
                                            <div class="flex items-center px-2">
                                              <span class="_text-gray" style="font-size: 10px;">{projectCount} project{projectCount === 1 ? '' : 's'}</span>
                                              <ButtonFrameless
                                                variant="blue"
                                                title="Edit label"
                                                on:click={(e) => { e.stopPropagation(); handleEditLabel(label); justOpenedEditModal.set(true); }}
                                              >
                                                <Pencil class="_icon-small" />
                                              </ButtonFrameless>
                                              <ButtonFrameless
                                                variant="red"
                                                title="Delete label"
                                                on:click={(e) => { e.stopPropagation(); handleDeleteLabelFromDropdown(label, projects, labelsStore, projectsStore); }}
                                              >
                                                <Trash2 class="_icon-small" />
                                              </ButtonFrameless>
                                            </div>
                                          </div>
                                          {/each}
                                        {/if}
                                      {/if}

                                      <!-- AVAILABLE Section -->
                                      {#if filteredLabelsForActiveProject.length > 0}
                                        <button
                                          on:click={toggleAvailableSection}
                                          class="w-full px-3 py-1 _text-small font-normal _text-gray _bg-gray-light border-b _border-gray-light flex items-center gap-2 hover:_bg-gray-regular transition-colors"
                                        >
                                          <ChevronRight class="w-5 h-5 transition-transform duration-200 {$availableSectionCollapsed ? '' : 'rotate-90'}" />
                                          <span class="_text-small">AVAILABLE</span>
                                          <span class="_bg-gray-regular _text-gray-black px-1.5 py-0.5 rounded-full _text-small">{filteredLabelsForActiveProject.length}</span>
                                        </button>
                                        {#if !$availableSectionCollapsed}
                                          {#each filteredLabelsForActiveProject as label, index}
                                          {@const projectCount = getProjectCountForLabel(label.id, projects)}
                                          {@const isSelected = $selectedLabelIndex === index}
                                          <div
                                            class="flex items-center group {isSelected ? '_dropdown-item-highlight' : 'hover:_dropdown-item-highlight'}"
                                            on:mouseenter={() => selectedLabelIndex.set(-1)}
                                            data-label-index={index}
                                          >
                                            <button
                                              on:click|stopPropagation={() => handleAddLabelToProject(project.id, label.id, projectsStore)}
                                              class="flex-1 px-3 py-2 text-left _text-regular-small flex items-center gap-2"
                                            >
                                              <div class="w-5 h-5 rounded-full" style="background-color: {label.color}"></div>
                                              <span>{label.title}</span>
                                            </button>
                                            <div class="flex items-center px-2">
                                              <span class="_text-gray" style="font-size: 10px;">{projectCount} project{projectCount === 1 ? '' : 's'}</span>
                                              <ButtonFrameless
                                                variant="blue"
                                                title="Edit label"
                                                on:click={(e) => { e.stopPropagation(); handleEditLabel(label); justOpenedEditModal.set(true); }}
                                              >
                                                <Pencil class="_icon-small" />
                                              </ButtonFrameless>
                                              <ButtonFrameless
                                                variant="red"
                                                title="Delete label"
                                                on:click={(e) => { e.stopPropagation(); handleDeleteLabelFromDropdown(label, projects, labelsStore, projectsStore); }}
                                              >
                                                <Trash2 class="_icon-small" />
                                              </ButtonFrameless>
                                            </div>
                                          </div>
                                          {/each}
                                        {/if}
                                      {/if}

                                      <!-- Empty State for Sectioned Mode -->
                                      {#if addedLabelsForActiveProject.length === 0 && filteredLabelsForActiveProject.length === 0}
                                        <div class="px-3 py-4 _text-regular-small _text-gray text-center">
                                          No labels available to add
                                        </div>
                                      {/if}

                                    {/if}
                                    </div>

                                    <!-- Sticky Create New Label Button (outside scroll area) -->
                                    <div class="border-t _border-gray-light">
                                      <button
                                        on:click|stopPropagation={createLabelFromSearch}
                                        on:mouseenter={() => selectedLabelIndex.set(-1)}
                                        class="w-full px-3 py-2 text-left _text-regular-small {$selectedLabelIndex === filteredLabelsForActiveProject.length ? '_bg-blue-light' : '_bg-blue-light hover:_bg-blue-light'} _text-blue transition-all flex items-center gap-2"
                                        data-create-label-button="true"
                                      >
                                        <span class="{$selectedLabelIndex === filteredLabelsForActiveProject.length ? 'underline' : 'hover:underline'}">
                                          {#if $labelSearchQuery.trim()}
                                            + Create new label: "{$labelSearchQuery.trim()}"
                                          {:else}
                                            + Create new label...
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
                {#if (groupedProjects[column.id] || []).length === 0}
                  <div class="text-center py-8 _text-gray">
                    <p class="_text-regular">No projects</p>
                    {#if column.title !== 'Closed'}
                      <p class="_text-small mt-1">Drag projects here</p>
                    {:else}
                      <p class="_text-small mt-1">Closed projects only</p>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
            {/each}
          </div>
        </div>

        <!-- Empty state for no columns -->
        {#if columns.length === 0}
          <div class="text-center py-12">
            <p class="_text-regular _text-gray mb-4">No project columns found</p>
            <ButtonFramed
              variant="blue"
              on:click={loadDashboardData}
            >
              Reload
            </ButtonFramed>
          </div>
        {/if}
      {/if}
    {:else}
      <div class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <h2 class="text-xl font-semibold mb-4">Welcome to GitHub Projects Dashboard</h2>
          <p class="_text-gray-black mb-6">Sign in with GitHub to manage your projects</p>
          <ButtonFramed
            variant="black"
            size="large"
            class="mx-auto"
            loading={$isLoggingIn}
            loadingText="Logging in..."
            on:click={login}
          >
            Sign in with GitHub
          </ButtonFramed>
        </div>
      </div>
    {/if}
  </div>


  <!-- Label Delete Confirmation Modal -->
  <Modal
    show={$showDeleteConfirmation && $labelToDelete !== null}
    title="Delete Label"
    size="md"
    enableNoInputFieldKeyHandling={true}
    primaryButton={{
      text: 'Delete Label',
      variant: 'red',
      loading: $deletingLabel,
      loadingText: 'Deleting...'
    }}
    secondaryButton={{
      text: 'Cancel',
      variant: 'outline'
    }}
    on:primary={() => confirmDeleteLabel(labelsStore, projectsStore)}
    on:secondary={cancelDeleteLabel}
    on:close={cancelDeleteLabel}
  >
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <div class="w-4 h-4 rounded-full" style="background-color: {$labelToDelete?.color}"></div>
        <span class="font-semibold">{$labelToDelete?.title}</span>
      </div>

      <p class="_text-regular _text-gray-black">
        Are you sure you want to delete this label?
      </p>

      <p class="_text-regular _text-gray">
        This label is used by <span class="font-semibold">{$labelProjectCount}</span> project{$labelProjectCount === 1 ? '' : 's'}
        and will be removed from {$labelProjectCount === 1 ? 'it' : 'them'}.
      </p>

      <p class="_text-regular _text-gray mt-3">
        This action cannot be undone.
      </p>
    </div>
  </Modal>

  <!-- Label Edit Modal -->
  <Modal
    show={$showEditLabel}
    title={$labelToEdit ? 'Edit Label' : 'Create Label'}
    size="md"
    primaryButton={{
      text: $labelToEdit ? 'Save Changes' : 'Create Label',
      variant: 'blue',
      disabled: !$editLabelTitle.trim() || isDuplicateLabelNameResult,
      loading: $editingLabel,
      loadingText: 'Saving...'
    }}
    secondaryButton={{
      text: 'Cancel',
      variant: 'outline'
    }}
    on:primary={() => saveEditLabel(labelsStore, projectsStore)}
    on:secondary={cancelEditLabel}
    on:close={cancelEditLabel}
  >
    <div class="space-y-4">
      <!-- Label Title Input -->
      <div>
        <label class="block _text-regular font-medium _text-gray-black mb-2">
          Title
        </label>
        <InputField
          bind:value={$editLabelTitle}
          placeholder="Enter label name..."
          disabled={$editingLabel}
          errorMessage={isDuplicateLabelNameResult ? 'A label with this name already exists' : ''}
          autofocus
          selectAll
        />
      </div>

      <!-- Color Picker -->
      <div>
        <label class="block _text-regular font-medium _text-gray-black mb-2">
          Colour
        </label>
        <div class="flex items-center gap-1">
          <input
            type="color"
            bind:value={$editLabelColor}
            on:input={() => justOpenedEditModal.set(false)}
            class="sr-only"
            disabled={$editingLabel}
            id="colorPicker"
          />
          <label
            for="colorPicker"
            class="flex-1 flex items-center gap-2 px-3 py-2 rounded-full _text-regular cursor-pointer {$editLabelTextColor === 'black' ? '_text-black' : '_text-white'}"
            style="background-color: {$editLabelColor}"
          >
            <span>{$editLabelTitle || 'Preview'}</span>
          </label>
          <ButtonFrameless
            variant="blue"
            title="Choose color"
            padding="p-2"
            rounded="rounded-lg"
            on:click={() => document.getElementById('colorPicker')?.click()}
          >
            <Pencil class="_icon-large" />
          </ButtonFrameless>
        </div>
      </div>

      <!-- Text Color Selection -->
      <div>
        <label class="block _text-regular font-medium _text-gray-black mb-2">
          Text Colour
        </label>
        <div class="flex items-center gap-3">
          <!-- Black Label Preview -->
          <span class="px-3 py-1 _text-regular-small font-bold rounded-full _text-black _bg-gray-regular">Black</span>

          <!-- Toggle Switch -->
          <button
            type="button"
            on:click={() => editLabelTextColor.set(toggleTextColor($editLabelTextColor))}
            disabled={$editingLabel}
            class="relative inline-flex h-6 w-11 items-center rounded-full _bg-gray-regular transition-colors focus:outline-none"
          >
            <span class="sr-only _text-regular">Toggle text color</span>
            <span class="inline-block h-4 w-4 transform rounded-full _bg-gray-black transition-transform {$editLabelTextColor === 'white' ? 'translate-x-6' : 'translate-x-1'} shadow-sm"></span>
          </button>

          <!-- White Label Preview -->
          <span class="px-3 py-1 _text-regular-small font-bold rounded-full _text-white _bg-black">White</span>
        </div>
      </div>
    </div>
  </Modal>

  <!-- Create Column Modal -->
  <Modal
    show={$showCreateColumn}
    title="Create New Column"
    size="md"
    primaryButton={{
      text: 'Create Column',
      variant: 'blue',
      disabled: !$newColumnTitle.trim() || isDuplicateNewColumnNameResult,
      loading: $creatingColumn,
      loadingText: 'Creating...'
    }}
    secondaryButton={{
      text: 'Cancel',
      variant: 'outline'
    }}
    on:primary={() => handleCreateColumn(columnsStore)}
    on:secondary={() => { showCreateColumn.set(false); newColumnTitle.set(''); insertAfterColumnId.set(null); }}
    on:close={() => { showCreateColumn.set(false); newColumnTitle.set(''); insertAfterColumnId.set(null); }}
  >
    <div class="space-y-4">
      <div>
        <label class="block _text-regular font-medium _text-gray-black mb-2">
          Name
        </label>
        <InputField
          bind:value={$newColumnTitle}
          placeholder="Enter column name..."
          errorMessage={isDuplicateNewColumnNameResult ? 'A column with this name already exists' : ''}
          autofocus
        />
      </div>

      <div class="_text-regular _text-gray">
        {#if $insertAfterColumnId}
          {@const afterColumn = columns.find(s => s.id === $insertAfterColumnId)}
          The new column will be created to the right of the "{afterColumn?.title || 'Unknown'}" column.
        {:else}
          The new column will be created to the left of the "Closed" column.
        {/if}
      </div>
    </div>
  </Modal>

  <!-- Delete Column Confirmation Modal -->
  <Modal
    show={$showDeleteColumn && $columnToDelete !== null}
    title="Delete Column"
    size="md"
    enableNoInputFieldKeyHandling={true}
    primaryButton={{
      text: 'Delete Column',
      variant: 'red',
      loading: $deletingColumn,
      loadingText: 'Deleting...'
    }}
    secondaryButton={{
      text: 'Cancel',
      variant: 'outline'
    }}
    on:primary={() => confirmDeleteColumn(columnsStore, projectsStore)}
    on:secondary={cancelDeleteColumn}
    on:close={cancelDeleteColumn}
  >
    <div class="space-y-4">
      <p class="_text-regular _text-gray-black">
        Are you sure you want to delete the "<strong>{$columnToDelete?.title}</strong>" column?
      </p>

      <p class="_text-regular _text-gray mt-3">
        All projects in this column will be moved to "No Status". This action cannot be undone.
      </p>
    </div>
  </Modal>

  <!-- Edit Column Modal -->
  <Modal
    show={$showEditColumn}
    title="Edit Column"
    size="md"
    primaryButton={{
      text: 'Save Changes',
      variant: 'blue',
      disabled: !$editColumnTitle.trim() || isDuplicateEditColumnNameResult,
      loading: $editingColumn,
      loadingText: 'Saving...'
    }}
    secondaryButton={{
      text: 'Cancel',
      variant: 'outline'
    }}
    on:primary={() => handleEditColumn(columnsStore)}
    on:secondary={cancelEditColumn}
    on:close={cancelEditColumn}
  >
    <div class="space-y-4">
      <div>
        <label class="block _text-regular font-medium _text-gray-black mb-2">
          Name
        </label>
        <InputField
          bind:value={$editColumnTitle}
          placeholder="Enter column name..."
          errorMessage={isDuplicateEditColumnNameResult ? 'A column with this name already exists' : ''}
          autofocus
          selectAll
        />
      </div>
    </div>
  </Modal>
</main>
