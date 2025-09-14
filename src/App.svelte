<script lang='ts'>
  import { onMount } from 'svelte';
  import { setupAuth, login, logout, isLoggedIn, isLoggingOut } from './lib/auth';
  import { loadProjectsFromGitHub, githubProjects } from './lib/github';
  import { initializeUserStatuses, syncProjects, fetchStatuses, fetchProjects, createStatus, deleteStatus, updateProjectStatus, fetchLabels, createLabel, deleteLabel, addProjectLabel, removeProjectLabel, updateStatusSorting, sortProjects } from './lib/database';
  import type { Status, Project, Label, SortField, SortDirection } from './lib/database';
  import type { GitHubProject } from './lib/github';
  import { parse, filter } from 'liqe';
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';
  import customParseFormat from 'dayjs/plugin/customParseFormat';

  let statuses: Status[] = [];
  let projects: Project[] = [];
  let labels: Label[] = [];
  let githubProjectsData: Record<string, GitHubProject> = {};
  let loading = false;
  let error = '';
  let showAddStatus = false;
  let newStatusTitle = '';
  let creatingStatus = false;
  let showAddLabel = false;
  let newLabelTitle = '';
  let newLabelColor = '#3b82f6';
  let creatingLabel = false;
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

  // Tooltip state management
  let tooltipVisible = false;
  let tooltipX = 0;
  let tooltipY = 0;
  let tooltipText = '';

  function showTooltip(event: MouseEvent, text: string) {
    tooltipText = text;
    tooltipX = event.clientX + 10;
    tooltipY = event.clientY - 10;
    tooltipVisible = true;
  }

  function hideTooltip() {
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

  // Handle keyboard events for new status input
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleCreateStatus();
    } else if (event.key === 'Escape') {
      showAddStatus = false;
      newStatusTitle = '';
    }
  }

  // Create new label
  async function handleCreateLabel() {
    if (!newLabelTitle.trim() || creatingLabel) return;

    creatingLabel = true;
    try {
      await createLabel(newLabelTitle.trim(), newLabelColor);

      // Refresh labels
      const updatedLabels = await fetchLabels();
      labels = [...updatedLabels];

      // Reset form
      newLabelTitle = '';
      newLabelColor = '#3b82f6';
      showAddLabel = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create label';
      console.error('Create label error:', err);
    } finally {
      creatingLabel = false;
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

  // Handle keyboard events for new label input
  function handleLabelKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleCreateLabel();
    } else if (event.key === 'Escape') {
      showAddLabel = false;
      newLabelTitle = '';
      newLabelColor = '#3b82f6';
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
        <!-- Status Management -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Project Statuses</h2>
            {#if !showAddStatus}
              <button
                on:click={() => showAddStatus = true}
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Add Status
              </button>
            {/if}
          </div>

          {#if showAddStatus}
            <div class="bg-white rounded-lg shadow p-4 mb-4">
              <div class="flex items-center gap-3">
                <input
                  bind:value={newStatusTitle}
                  on:keydown={handleKeydown}
                  placeholder="Enter status name..."
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={creatingStatus}
                />
                <button
                  on:click={handleCreateStatus}
                  disabled={!newStatusTitle.trim() || creatingStatus}
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {#if creatingStatus}
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  {:else}
                    Create
                  {/if}
                </button>
                <button
                  on:click={() => { showAddStatus = false; newStatusTitle = ''; }}
                  class="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={creatingStatus}
                >
                  Cancel
                </button>
              </div>
              <p class="text-sm text-gray-500 mt-2">Press Enter to create, Escape to cancel</p>
            </div>
          {/if}
        </div>

        <!-- Labels Management -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Labels</h2>
            {#if !showAddLabel}
              <button
                on:click={() => showAddLabel = true}
                class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                </svg>
                Add Label
              </button>
            {/if}
          </div>

          {#if showAddLabel}
            <div class="bg-white rounded-lg shadow p-4 mb-4">
              <div class="flex items-center gap-3 mb-3">
                <input
                  bind:value={newLabelTitle}
                  on:keydown={handleLabelKeydown}
                  placeholder="Enter label name..."
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={creatingLabel}
                />
                <input
                  type="color"
                  bind:value={newLabelColor}
                  class="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  disabled={creatingLabel}
                />
                <button
                  on:click={handleCreateLabel}
                  disabled={!newLabelTitle.trim() || creatingLabel}
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {#if creatingLabel}
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  {:else}
                    Create
                  {/if}
                </button>
                <button
                  on:click={() => { showAddLabel = false; newLabelTitle = ''; newLabelColor = '#3b82f6'; }}
                  class="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={creatingLabel}
                >
                  Cancel
                </button>
              </div>
              <p class="text-sm text-gray-500">Press Enter to create, Escape to cancel</p>
            </div>
          {/if}

          <!-- Labels List -->
          {#if labels.length > 0}
            <div class="bg-white rounded-lg shadow p-4">
              <div class="flex flex-wrap gap-2">
                {#each labels as label}
                  <div class="flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm" style="background-color: {label.color}">
                    <span>{label.title}</span>
                    <button
                      on:click={() => handleDeleteLabel(label)}
                      class="hover:bg-black/20 rounded-full p-1 transition-colors"
                      title="Delete label {label.title}"
                    >
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                      </svg>
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="bg-white rounded-lg shadow p-4 text-center text-gray-500">
              <p>No labels created yet</p>
              <p class="text-xs mt-1">Create labels to organize your projects</p>
            </div>
          {/if}
        </div>

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
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="font-semibold text-gray-900">{status.title}</h3>
                    <p class="text-sm text-gray-500">
                      {(groupedProjects[status.id] || []).length} projects
                    </p>
                  </div>
                  <div class="flex items-center gap-1">
                    <!-- Sorting controls -->
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
                    {#if !status.is_system}
                    <button
                      on:click={() => handleDeleteStatus(status)}
                      class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete this status"
                      aria-label="Delete status {status.title}"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      </button>
                    {/if}
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
                {#each sortProjects(groupedProjects[status.id] || [], githubProjectsData, status) as project}
                  {@const githubProject = githubProjectsData[project.id]}
                  {@const isDragging = draggedProject?.id === project.id}
                  {@const isClosedColumn = status.title === 'Closed'}
                  {#if githubProject}
                    <div
                      class="bg-gray-50 rounded-lg p-3 transition-all duration-200 {isDragging ? 'opacity-50 scale-95' : 'hover:bg-gray-100 hover:shadow-md'} {!isClosedColumn ? 'cursor-move' : ''}"
                      draggable={!isClosedColumn}
                      role={!isClosedColumn ? "button" : undefined}
                      aria-label={!isClosedColumn ? `Drag ${githubProject.title} to another status` : undefined}
                      tabindex={!isClosedColumn ? "0" : undefined}
                      on:dragstart={(e) => !isClosedColumn && handleDragStart(e, project)}
                      on:dragend={handleDragEnd}
                    >
                      <!-- Drag Handle and Project Title -->
                      <div class="flex items-start gap-2">
                        {#if !isClosedColumn}
                          <div class="flex-shrink-0 mt-1 text-gray-400 hover:text-gray-600">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"></path>
                            </svg>
                          </div>
                        {/if}
                        <div class="flex-1 min-w-0">
                      <h4 class="font-medium text-gray-900 mb-1">
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
                      <div class="text-sm text-gray-600 mb-2">
                        {#if githubProject.shortDescription}
                          <p class="mb-1">{githubProject.shortDescription}</p>
                        {/if}
                        <div class="flex items-center gap-2">
                          <span>#{githubProject.number}</span>
                          <span>•</span>
                          <span>{githubProject.items} items</span>
                          {#if githubProject.isClosed}
                            <span class="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                              Closed
                            </span>
                          {:else}
                            <span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                              Open
                            </span>
                          {/if}
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
                            <!-- Current Labels -->
                            {#if project.labels && project.labels.length > 0}
                              <div class="flex flex-wrap gap-1 mb-2">
                                {#each project.labels as label}
                                  <div class="flex items-center gap-1 px-2 py-1 text-xs rounded-full text-white" style="background-color: {label.color}">
                                    <span>{label.title}</span>
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
                              </div>
                            {/if}

                            <!-- Add Label Dropdown -->
                            {#if labels.length > 0}
                              {@const projectLabelIds = new Set(project.labels?.map(l => l.id) || [])}
                              {@const availableLabels = labels.filter(l => !projectLabelIds.has(l.id))}
                              {#if availableLabels.length > 0}
                                <select
                                  class="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700"
                                  on:change={(e) => {
                                    const labelId = e.target.value;
                                    if (labelId) {
                                      handleAddProjectLabel(project.id, labelId);
                                      e.target.value = ''; // Reset selection
                                    }
                                  }}
                                  on:click|stopPropagation
                                >
                                  <option value="">+ Add label</option>
                                  {#each availableLabels as label}
                                    <option value={label.id}>{label.title}</option>
                                  {/each}
                                </select>
                              {:else}
                                <div class="text-xs text-gray-500">All labels assigned</div>
                              {/if}
                            {:else}
                              <div class="text-xs text-gray-500">No labels available</div>
                            {/if}
                          </div>
                        </div>
                      </div>
                    </div>
                  {/if}
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
</main>
