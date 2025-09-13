<script lang='ts'>
  import { onMount } from 'svelte';
  import { setupAuth, login, logout, isLoggedIn, isLoggingOut } from './lib/auth';
  import { loadProjectsFromGitHub, githubProjects } from './lib/github';
  import { initializeUserStatuses, syncProjects, fetchStatuses, fetchProjects } from './lib/database';
  import type { Status, Project } from './lib/database';
  import type { GitHubProject } from './lib/github';

  let statuses: Status[] = [];
  let projects: Project[] = [];
  let githubProjectsData: Record<string, GitHubProject> = {};
  let loading = false;
  let error = '';

  // Subscribe to GitHub projects data
  $: githubProjectsData = $githubProjects;

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
      [statuses, projects] = await Promise.all([
        fetchStatuses(),
        fetchProjects()
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

  // Group projects by status
  function getProjectsByStatus(statusId: string): Project[] {
    return projects.filter(p => p.status_id === statusId).sort((a, b) => a.position - b.position);
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
      <div class="bg-white rounded-lg shadow p-6">
        <p class="text-gray-600">You are logged in! Ready to fetch GitHub Projects.</p>
      </div>
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
</main>