<script>
  import { fade } from 'svelte/transition';
  // Top offset class where overlay starts (may be a Tailwind class)
  export let topClass = 'top-0';
  // Callback to execute when the overlay is clicked
  export let onClick = () => {};
</script>

<div class={`fixed left-0 right-0 bottom-0 z-40 bg-black bg-opacity-30 ${topClass}`} on:click={onClick} in:fade={{ duration: 150 }} out:fade={{ duration: 0 }} />
