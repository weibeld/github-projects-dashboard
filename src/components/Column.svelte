<script lang='ts'>
  import ProjectCard from './ProjectCard.svelte';
  import { dndSortable } from '../lib/dndSortable.js';
  import { githubProjects } from '../lib/github';
  import type { ProjectID } from '../lib/commonTypes';
  import { logRaw } from '../lib/log';
  export let title;
  export let projects = [];
  export let bindRef = null;
  export let dndIsClosedColumn = false;
  // TODO: fix persistence with local storage
  export let dndOnDrop = () => {};
  let containerRef;
  // Forward the actual DOM element to the parent
  // TODO: what is this for?
  $: if (bindRef) bindRef.set(containerRef);

  let projectIDs: ProjectID[] = [];
  $: projectIDs = Object.keys($githubProjects);
</script>

<div class="bg-githubBgColor border border-githubBorderColor p-3 rounded flex flex-col">
  <h2 class="text-lg text-left font-semibold mb-2 capitalize">{title} <span class="text-githubSecondaryTextColor text-sm">({projects.length})</span></h2>
  <div use:dndSortable={{ group: dndIsClosedColumn ? "closed-column" : "normal-columns", dndOnDrop }} class="space-y-2 min-h-[50px]" bind:this={containerRef}>
    {#each projectIDs as id}
      <ProjectCard projectId = {id} />
    {/each}
  </div>
</div>
