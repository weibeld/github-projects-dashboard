<script>
  import Column from './Column.svelte';
  import Overlay from './Overlay.svelte';
  import { X } from 'lucide-svelte';
  // Custom Svelte Actions
  import { onEscape } from '../lib/onEscape.js';  // Svelte action
  import { disableScroll } from '../lib/disableScroll.js';  // Svelte action
  export let projects = [];
  export let onClose;
  export let dndOnDrop = () => {}; // DnD drop (from App.svelte)
</script>

<!-- Overlay shading page content below header when pane is open -->
<Overlay topClass="top-16" onClick={onClose} />

<!-- Pane -->
<div use:onEscape={onClose} use:disableScroll class="_slide-in-container top-16 w-1/2 h-[calc(100vh-4rem)] flex flex-col pt-4 pb-2 pl-4 pr-2">
  <div class="flex h-full items-start gap-2">
    <div class="flex-1 w-full h-full grid grid-cols-1 sm:grid-cols-1">
      <Column title="closed" projects={projects} isClosedColum={true} dndOnDrop={dndOnDrop("closed")} />
    </div>
    <button on:click={onClose} class="top-2 right-2 text-githubSecondaryTextColor hover:bg-githubButtonHoverBgColor p-2.5 rounded-lg" aria-label="Close">
      <X class="w-4 h-4" />
    </button>
  </div>
</div>
