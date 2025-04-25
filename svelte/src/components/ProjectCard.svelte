<script>
  import { slide } from 'svelte/transition';
  export let project;
  let expanded = false;
  const toggle = () => {
    expanded = !expanded;
  };
  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, 
    }) : "–";
</script>

<div class="p-2 bg-white text-left rounded border shadow-sm cursor-default">
  <a href={project.url} target="_blank" class="hover:underline text-blue-600 block">{project.title}</a>
  <button on:click={toggle} class="text-sm mt-1 flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100 transition-colors">
    <span>{expanded ? "▼" : "►"}</span>
    Details
  </button>

  {#if expanded}
    <div class="mt-2 text-xs space-y-1" transition:slide>
      <div>
        <span>{project.public ? "Public" : "Private"}</span>
      </div>
      <div>
        <span>Updated:</span>
        <span>{formatDate(project.updatedAt)}</span>
      </div>
      <div>
        <span>Created:</span>
        <span>{formatDate(project.createdAt)}</span>
      </div>
      {#if project.closed}
        <div>
          <span>Closed:</span>
          <span>{formatDate(project.closedAt)}</span>
        </div>
      {/if}
      <div>
        <span>{project.id}</span>
      </div>
    </div>
  {/if}
</div>
