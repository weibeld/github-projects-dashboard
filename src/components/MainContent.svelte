<script>
  import { Archive } from 'lucide-svelte';
  import LoadingScreen from './LoadingScreen.svelte';
  import { metadata, metaProjects, metaLabels, metaStatuses, metaViews, isColumnVisible } from '../lib/metadata';
  import { tooltip } from '../lib/tooltip';  // Svelte action
  import Column from './Column.svelte';
</script>

<!-- TODO: this should check for the completion of loadProjectsFromGitHub() -->
{#if !$metadata}
  <LoadingScreen message="Loading projects" />
{:else}
  {#each $metaViews as view (view.id)}
    <!--{#if view.id === $activeViewId}-->
      <!--<div class="grid grid-cols-1 sm:grid-cols-2 w-full pt-4 pb-2 px-4 gap-4">-->
        {#each $metaStatuses as status (status.id)}
          {#if isColumnVisible(view.id, status.id)}
            <Column title={status.title} projects={[]} />
          {/if}
        {/each}
      <!--</div>-->
    <!--{/if}-->
  {/each}


  <!-- {#each $metadata.statuses as statusId (statusId)}
    {#if !$metadata.views[$metadata.activeViewId].statusVisibility[statusId]}
      <Column
        title={statusId}
        projects={getFilteredProjects(statusId)}
        dndOnDrop={handleDrop(statusId)}
      />
    {/if}
    {/each} -->
  <!--<div class="flex-1 grid grid-cols-1 sm:grid-cols-2 w-full pt-4 pb-2 px-4 gap-4">
    <Column title={columns[0]} projects={getFilteredProjects(columns[0])} bindRef={todoRef} dndOnDrop={handleDrop(columns[0])} />
    <Column title={columns[1]} projects={getFilteredProjects(columns[1])} bindRef={doingRef} dndOnDrop={handleDrop(columns[1])} />
  </div>-->
  <button use:tooltip={{ text: "Closed projects", align: "right" }} on:click={() => closedPaneOpen = !closedPaneOpen} class="_button p-2 absolute right-0 top-16 mt-4 z-30" aria-label="Toggle closed pane">
    <Archive class="_icon" />
  </button>
  <!--{#if closedPaneOpen}
    <ClosedColumnPane onClose={() => closedPaneOpen = false} projects={getClosedProjects()} dndOnDrop={handleDrop(columns[2])} />
  {/if}-->
{/if}
