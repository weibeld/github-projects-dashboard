<script lang="ts">
  import Tooltip from './Tooltip.svelte';

  export let variant: 'blue' | 'red' | 'neutral' = 'blue';
  export let disabled: boolean = false;
  export let title: string = '';
  export let padding: string = 'p-1';
  export let rounded: string = 'rounded';

  $: colorClass = disabled
    ? '_text-gray-button-disabled hover:_bg-gray-light cursor-not-allowed'
    : {
        blue: '_text-gray-button hover:_text-blue hover:_bg-blue-light',
        red: '_text-gray-button hover:_text-red hover:_bg-red-light',
        neutral: '_text-gray-button hover:_text-black'
      }[variant];
</script>

<Tooltip text={title} speed="slow">
  <button
    class="{colorClass} {padding} {rounded}"
    {disabled}
    on:click
    on:mousedown
    on:mouseup
    on:mouseenter
    on:mouseleave
    on:focus
    on:blur
    on:keydown
    on:keyup
  >
    <slot />
  </button>
</Tooltip>
