<script>
  export let project;
</script>

<div class="p-2 text-left bg-white rounded border shadow-sm cursor-move" data-id={project.id}>
  <a href={project.url} target="_blank" class="hover:underline text-blue-600 font-medium">
    {project.title}
  </a>
  <div class="mt-1 text-xs">
    {#if project.public}
      <span class="text-green-500">Public</span>
    {:else}
      <span class="text-red-500">Private</span>
    {/if}
    {#if project.closed}
      <span class="ml-2 text-red-500">Closed</span>
    {/if}
  </div>
  <div class="mt-1 text-xs text-gray-400">
    {#if project.closed}
      Closed: {project.closedAt ? new Date(project.closedAt).toLocaleDateString() : '—'}
    {:else}
      Updated: {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '—'}<br>
      Created: {new Date(project.createdAt).toLocaleDateString()}<br>
    {/if}
  </div>
  <div class="mt-0.5 text-xs text-gray-400">{project.id}</div>
</div>
