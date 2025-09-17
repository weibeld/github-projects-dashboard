<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';
  import ButtonFrameless from './ButtonFrameless.svelte';
  import ButtonFramed from './ButtonFramed.svelte';

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
    loadingText?: string;
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
            <ButtonFramed
              variant={secondaryButton.variant || 'outline'}
              disabled={secondaryButton.disabled || primaryButton?.loading}
              on:click={handleSecondary}
            >
              {secondaryButton.text}
            </ButtonFramed>
          {/if}

          {#if primaryButton}
            <ButtonFramed
              variant={primaryButton.variant || 'blue'}
              disabled={primaryButton.disabled}
              loading={primaryButton.loading}
              loadingText={primaryButton.loadingText}
              on:click={handlePrimary}
            >
              {primaryButton.text}
            </ButtonFramed>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
