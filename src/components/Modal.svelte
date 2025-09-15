<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';

  export let show: boolean = false;
  export let title: string = '';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let showCloseButton: boolean = true;
  export let closeOnBackdrop: boolean = true;
  export let closeOnEscape: boolean = true;

  // Button configurations
  export let primaryButton: {
    text: string;
    variant?: 'blue' | 'red' | 'green' | 'gray';
    disabled?: boolean;
    loading?: boolean;
  } | null = null;

  export let secondaryButton: {
    text: string;
    variant?: 'outline' | 'ghost';
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
    blue: 'bg-blue-600 text-white hover:bg-blue-700',
    red: 'bg-red-600 text-white hover:bg-red-700',
    green: 'bg-green-600 text-white hover:bg-green-700',
    gray: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'text-gray-700 border border-gray-300 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100'
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
            <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
          {:else}
            <div></div>
          {/if}

          {#if showCloseButton}
            <button
              on:click={handleClose}
              class="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={primaryButton?.loading}
            >
              <X class="w-6 h-6" />
            </button>
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