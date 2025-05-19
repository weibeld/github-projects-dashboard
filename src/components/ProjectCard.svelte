<script lang='ts'>
  import { Lock, Globe, ChevronDown, ChevronRight } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import type { ProjectID } from '../lib/commonTypes';
  import { githubProjects } from '../lib/github';
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';
  import { logRaw } from '../lib/log';
  export let projectId: ProjectID;

  dayjs.extend(relativeTime);
  const formatDate = (date) => date ? dayjs(date).format('D MMM YYYY HH:mm') : '–';
  const relativeDate = (date) => date ? dayjs(date).fromNow() : '';

  let expanded = false;
  const toggle = () => { expanded = !expanded; };

  let project: GitHubProject = {};
  $: project = $githubProjects[projectId];
</script>

<div class="p-2 bg-white text-left rounded border shadow-sm cursor-grab">
  <div>
    <span class="text-githubSecondaryTextColor font-semibold">#{project.number}</span>
    <a href={project.url} target="_blank" class="_classic-link font-semibold">{project.title}</a>
  </div>
  <div class="text-sm text-githubSecondaryTextColor mt-0.5">
    {#if project.isClosed}
      Closed {relativeDate(project.closedAt)}
    {:else}
      Updated {relativeDate(project.updatedAt)}
    {/if}
  </div>
  <!-- TODO: apply _button class -->
  <button on:click={toggle} class="_button gap-0.5 text-sm mt-1 px-1 py-0.5">
    {#if expanded}
      <ChevronDown class="_icon" />
    {:else}
      <ChevronRight class="_icon" />
    {/if}
    Details
  </button>
  {#if expanded}
    <div class="mt-2 text-xs space-y-1 bg-githubBgColor rounded border border-githubBordercolor p-2" transition:slide>
      <div>
        <a href={project.url} target="_blank" class="_classic-link">
          <span>{project.items} {project.items === 1 ? 'item' : 'items'}</span>
        </a>
      </div>
      {#if project.isClosed}
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
      {#if project.shortDescription}
        <div class="text-center italic my-1">
          <!--<blockquote class="text-githubSecondaryTextColor bg-githubBgColor rounded-md border border-githubBorderColor _padding">-->
          <blockquote class="text-githubSecondaryTextColor">
            “{project.shortDescription}”
          </blockquote>
        </div>
      {/if}
      <div>
        <span class="inline-flex items-center gap-0.5 border border-githubBorderColor text-xs text-githubSecondaryTextColor px-1 py-0.5 rounded-full">
        {#if project.isPublic}<Globe class="w-3 h-3" /> Public{:else}<Lock class="w-3 h-3" /> Private{/if}
        </span>
      </div>
    </div>
  {/if}
</div>
