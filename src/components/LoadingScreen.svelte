<script lang="ts">
  import { Loader } from 'lucide-svelte';
  export let message: string | undefined = undefined;
</script>

<div class="flex flex-col items-center">
  <Loader class="w-8 h-8 animate-spin mb-2" />
  {#if message}
    <p class="text-lg font-semibold text-githubSecondaryTextColor animate-pulse duration-100">
      {message}
    </p>
  {/if}
</div>
