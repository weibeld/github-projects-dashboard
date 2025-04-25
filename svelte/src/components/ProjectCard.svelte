<script>
  import { Lock, Globe } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  export let project;
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';
  dayjs.extend(relativeTime);
  let expanded = false;
  const toggle = () => {
    expanded = !expanded;
  };
  const formatDate = (date) =>
    date ? dayjs(date).format('D MMM YYYY HH:mm') : '–';

  const relativeDate = (date) =>
    date ? dayjs(date).fromNow() : '';
  /*const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, 
    }) : "–";*/
</script>

<div class="p-2 bg-white text-left rounded border shadow-sm cursor-default">
  <div>
    <span class="text-blue-500 font-semibold">#{project.number}</span>
    <a href={project.url} target="_blank" class="hover:underline text-blue-600 font-semibold">{project.title}</a>
  </div>
  <div class="text-sm italic text-gray-500 mt-0.5">
    {#if project.closed}
      Closed {relativeDate(project.closedAt)}
    {:else}
      Updated {relativeDate(project.updatedAt)}
    {/if}
  </div>
  <button on:click={toggle} class="text-sm mt-1 flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100 transition-colors">
    <span>{expanded ? "▼" : "►"}</span>
    Details
  </button>
  {#if expanded}
    <div class="mt-2 text-xs space-y-1" transition:slide>
      <div>
        <span>{project.items.totalCount} {project.items.totalCount === 1 ? 'item' : 'items'}</span>
      </div>
      {#if project.closed}
        <div>
          <span>Closed:</span>
          <span>{formatDate(project.closedAt)} ({relativeDate(project.closedAt)})</span>
        </div>
      {:else}
        <div>
          <span>Updated:</span>
          <span>{formatDate(project.updatedAt)} ({relativeDate(project.updatedAt)})</span>
        </div>
      {/if}
      <div>
        <span>Created:</span>
        <span>{formatDate(project.createdAt)} ({relativeDate(project.createdAt)})</span>
      </div>
      <div>
        <span class="inline-flex items-center gap-1 border border-gray-400 text-xs px-2 py-0.5 rounded-full">
        {#if project.public}
          <Globe class="w-3 h-3" /> Public
        {:else}
          <Lock class="w-3 h-3" /> Private
        {/if}
        </span>
      </div>
    </div>
  {/if}
</div>
