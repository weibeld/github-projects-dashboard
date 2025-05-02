<script>
  import Column from './Column.svelte';
  import Overlay from './Overlay.svelte';
  import { X } from 'lucide-svelte';
  import { onMount, onDestroy } from 'svelte';
  // Custom Svelte Actions
  import { onEscape } from '../lib/onEscape.js';  // Svelte action
  import { disableScroll } from '../lib/disableScroll.js';  // Svelte action
  export let projects = [];
  export let onClose;
</script>

<!-- Overlay shading page content below header when pane is open -->
<Overlay topClass="top-16" onClick={onClose} />

<!-- Pane -->
<div use:onEscape={onClose} use:disableScroll class="_slide-in-container top-16 w-1/2 h-[calc(100vh-4rem)] flex flex-col">
  <!--<button on:click={onClose} class="text-gray-500 hover:text-gray-700 p-2 rounded hover:bg-gray-300">
    <X class="w-4 h-4" />
  </button>-->
  <div class="flex-1 w-full grid grid-cols-1 sm:grid-cols-1 pt-4 pb-2 px-4">
    <Column title="closed" projects={projects} readonly={true} />
  </div>
</div>
