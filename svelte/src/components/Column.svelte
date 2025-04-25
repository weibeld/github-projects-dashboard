<script>
  import ProjectCard from './ProjectCard.svelte';
  export let title;
  export let projects = [];
  export let bindRef = null;
  let containerRef;
  // Forward the actual DOM element to the parent
  $: if (bindRef) bindRef.set(containerRef);
</script>

<div class="bg-gray-100 p-3 rounded shadow flex flex-col">
  <h2 class="text-lg font-semibold mb-2 capitalize">{title}</h2>
  <div class="space-y-2 min-h-[50px]" bind:this={containerRef}>
    {#each projects as project (project.id)}
      <ProjectCard {project} />
    {/each}
  </div>
</div>
