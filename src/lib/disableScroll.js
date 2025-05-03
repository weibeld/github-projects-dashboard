/*----------------------------------------------------------------------------*
 * disableScroll Svelte action
 * Disable ability to scroll the page.
 * Usage:
 *   use:disableScroll
 *----------------------------------------------------------------------------*/
export function disableScroll(node) {
  const originalOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  return {
    destroy() {
      document.body.style.overflow = originalOverflow;
    }
  };
}
