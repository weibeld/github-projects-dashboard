<script lang="ts">
  import { tick } from 'svelte';

  export let value: string = '';
  export let placeholder: string = '';
  export let disabled: boolean = false;
  export let autofocus: boolean = false;
  export let selectAll: boolean = false;
  export let size: 'regular' | 'small' = 'regular';
  export let errorMessage: string = '';

  let inputElement: HTMLInputElement;

  $: hasError = errorMessage.trim() !== '';
  $: sizeClass = size === 'small' ? '_text-regular-small' : '';
  $: errorClass = hasError
    ? '_border-red focus:_ring-red'
    : '_border-gray-regular focus:_ring-blue';

  // Handle autofocus and selectAll for dynamically created elements (like in modals)
  $: if (autofocus && inputElement) {
    tick().then(() => {
      inputElement.focus();
      if (selectAll) {
        inputElement.select();
      }
    });
  }
</script>

<div class="w-full">
  <input
    bind:this={inputElement}
    bind:value
    {placeholder}
    {disabled}
    type="text"
    on:keydown
    on:keyup
    on:focus
    on:blur
    on:input
    on:change
    class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent {sizeClass} {errorClass}"
  />
  {#if hasError}
    <p class="_text-regular _text-red mt-1">{errorMessage}</p>
  {/if}
</div>