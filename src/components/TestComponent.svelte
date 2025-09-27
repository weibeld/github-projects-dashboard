<!-- Test Component for New Business Layer -->
<script lang="ts">
  import { uiData, uiAuth, loadDataAndInitDataStore } from '../lib/business';
  import { onMount } from 'svelte';

  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      console.log('🧪 Testing new business layer...');

      // Load all data (auth + database + github)
      await loadDataAndInitDataStore();
      console.log('✅ All data loaded and store initialized');
    } catch (err) {
      console.error('❌ Test failed:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <div class="test-status loading">
    <h3>🧪 Testing New Business Layer</h3>
    <p>Loading...</p>
  </div>
{:else if error}
  <div class="test-status error">
    <h3>❌ Test Failed</h3>
    <p>Error: {error}</p>
  </div>
{:else if $uiData}
  <div class="test-status success">
    <h3>✅ New Business Layer Working!</h3>

    <div class="test-results">
      <h4>Dashboard Data:</h4>
      <ul>
        <li>Columns: {$uiData.columns.length}</li>
        {#each $uiData.columns as column}
          <li class="column-item">
            <strong>{column.title}</strong>: {column.projects.length} projects
            {#if column.projects.length > 0}
              <ul class="projects-list">
                {#each column.projects.slice(0, 3) as project}
                  <li>{project.title} ({project.labels.length} labels)</li>
                {/each}
                {#if column.projects.length > 3}
                  <li>...and {column.projects.length - 3} more</li>
                {/if}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>

      <h4>User Info:</h4>
      <p>User: {$uiAuth ? $uiAuth.githubUsername : 'Not logged in'}</p>
    </div>
  </div>
{:else}
  <div class="test-status neutral">
    <h3>📊 New Business Layer Ready</h3>
    <p>No dashboard data available (this might be normal if no data exists)</p>
  </div>
{/if}

<style>
  .test-status {
    padding: 1rem;
    margin: 1rem;
    border-radius: 8px;
    border: 2px solid;
  }

  .loading {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .success {
    border-color: #10b981;
    background: #f0fdf4;
  }

  .error {
    border-color: #ef4444;
    background: #fef2f2;
  }

  .neutral {
    border-color: #6b7280;
    background: #f9fafb;
  }

  .test-results {
    margin-top: 1rem;
  }

  .column-item {
    margin: 0.5rem 0;
  }

  .projects-list {
    margin-left: 1rem;
    font-size: 0.9em;
    color: #6b7280;
  }

  ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  li {
    margin: 0.25rem 0;
  }
</style>