<script lang="ts">
  export let variant: 'blue' | 'red' | 'black' | 'outline' = 'blue';
  export let size: 'regular' | 'large' = 'regular';
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let loadingText: string = 'Loading...';

  $: variantClass = {
    blue: '_bg-blue-regular _text-white hover:_bg-blue-dark',
    red: '_bg-red-regular _text-white hover:_bg-red-dark',
    black: '_bg-black _text-white hover:_bg-black-hover',
    outline: '_text-gray-black border _border-gray-regular hover:_bg-gray-light'
  }[variant];

  $: sizeClass = size === 'regular' ? 'px-4 py-2' : 'px-6 py-3';
</script>

<button
  on:click
  on:mousedown
  on:mouseup
  on:mouseenter
  on:mouseleave
  on:focus
  on:blur
  on:keydown
  on:keyup
  {disabled}
  class="rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors {variantClass} {sizeClass}"
>
  {#if loading}
    {loadingText}
  {:else}
    <slot />
  {/if}
</button>