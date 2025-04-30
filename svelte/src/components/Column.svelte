<script>
  import ProjectCard from './ProjectCard.svelte';
  export let title;
  export let projects = [];
  export let bindRef = null;
  let containerRef;
  // Forward the actual DOM element to the parent
  $: if (bindRef) bindRef.set(containerRef);
</script>

<div class="bg-githubBgColor border border-githubBorderColor p-3 rounded flex flex-col">
  <h2 class="text-lg text-left font-semibold mb-2 capitalize">{title} <span class="text-githubSecondaryTextColor text-sm">({projects.length})</span></h2>
  <div class="space-y-2 min-h-[50px]" bind:this={containerRef}>
    {#each projects as project (project.id)}
      <ProjectCard {project} />
    {/each}
  </div>
</div>
