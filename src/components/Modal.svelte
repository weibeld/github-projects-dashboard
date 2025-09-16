<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
  import ButtonFrameless from './ButtonFrameless.svelte';

  export let show: boolean = false;
  export let title: string = '';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let showCloseButton: boolean = true;
  export let closeOnBackdrop: boolean = true;
  export let closeOnEscape: boolean = true;

  // Button configurations
  export let primaryButton: {
    text: string;
    variant?: 'blue' | 'red';
    disabled?: boolean;
    loading?: boolean;
  } | null = null;

  export let secondaryButton: {
    text: string;
    variant?: 'outline';
    disabled?: boolean;
  } | null = { text: 'Cancel', variant: 'outline' };

  const dispatch = createEventDispatcher<{
    primary: void;
    secondary: void;
    close: void;
  }>();

  function handlePrimary() {
    dispatch('primary');
  }

  function handleSecondary() {
    dispatch('secondary');
  }

  function handleClose() {
    dispatch('close');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && closeOnEscape) {
      handleClose();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget && closeOnBackdrop) {
      handleClose();
    }
  }

  $: sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl'
  };

  $: buttonVariants = {
    blue: '_bg-blue-regular _text-white hover:_bg-blue-dark',
    red: '_bg-red-regular _text-white hover:_bg-red-dark',
    outline: '_text-gray-black border _border-gray-regular hover:_bg-gray-light'
  };
</script>

{#if show}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
  >
    <div class="bg-white rounded-lg shadow-xl p-6 {sizeClasses[size]} w-full mx-4">
      <!-- Header -->
      {#if title || showCloseButton}
        <div class="flex items-center justify-between mb-6">
          {#if title}
            <h3 class="_text-large font-semibold _text-black">{title}</h3>
          {:else}
            <div></div>
          {/if}

          {#if showCloseButton}
            <ButtonFrameless
              variant="neutral"
              disabled={primaryButton?.loading}
              on:click={handleClose}
            >
              <X class="_icon-large" />
            </ButtonFrameless>
          {/if}
        </div>
      {/if}

      <!-- Content -->
      <div class="mb-6">
        <slot />
      </div>

      <!-- Footer with buttons -->
      {#if primaryButton || secondaryButton}
        <div class="flex justify-end gap-3">
          {#if secondaryButton}
            <button
              on:click={handleSecondary}
              disabled={secondaryButton.disabled || primaryButton?.loading}
              class="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors {buttonVariants[secondaryButton.variant || 'outline']}"
            >
              {secondaryButton.text}
            </button>
          {/if}

          {#if primaryButton}
            <button
              on:click={handlePrimary}
              disabled={primaryButton.disabled || primaryButton.loading}
              class="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors {buttonVariants[primaryButton.variant || 'blue']}"
            >
              {primaryButton.loading ? 'Loading...' : primaryButton.text}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
