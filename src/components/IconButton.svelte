<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let variant: 'blue' | 'red' | 'neutral' = 'blue';
  export let disabled: boolean = false;
  export let title: string = '';

  const dispatch = createEventDispatcher<{
    click: MouseEvent;
  }>();

  function handleClick(event: MouseEvent) {
    if (!disabled) {
      dispatch('click', event);
    }
  }

  $: variantClass = disabled
    ? '_icon-button-disabled'
    : {
        blue: '_icon-button-hover-blue',
        red: '_icon-button-hover-red',
        neutral: '_icon-button-hover-neutral'
      }[variant];
</script>

<button
  type="button"
  {disabled}
  {title}
  class="{variantClass}"
  on:click={handleClick}
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