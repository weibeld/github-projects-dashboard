<script lang="ts">
  export let text: string;
  export let speed: 'fast' | 'slow' = 'fast';

  let tooltipVisible = false;
  let tooltipX = 0;
  let tooltipY = 0;
  let tooltipTimeout: number | null = null;

  $: delay = speed === 'fast' ? 200 : 600;

  function showTooltip(event: MouseEvent) {
    if (!text.trim()) return;

    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }

    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    tooltipX = rect.right + 8;
    tooltipY = rect.top + (rect.height / 2);

    tooltipTimeout = setTimeout(() => {
      tooltipVisible = true;
      tooltipTimeout = null;
    }, delay);
  }

  function hideTooltip() {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }
    tooltipVisible = false;
  }

  function handleClick() {
    hideTooltip();
  }
</script>

<span
  class="inline-flex"
  on:mouseenter={showTooltip}
  on:mouseleave={hideTooltip}
  on:click={handleClick}
>
  <slot />
</span>

{#if tooltipVisible}
  <div
    class="fixed pointer-events-none z-50 px-2 py-1 _text-small _text-white _bg-black rounded shadow-lg transform -translate-y-1/2"
    style="left: {tooltipX}px; top: {tooltipY}px;"
  >
    {text}
  </div>
{/if}
