/*----------------------------------------------------------------------------*
 * onEscape Svelte action
 * Perform action 'callback' when Esc is pressed.
 * Usage:
 *   use:onEscape={myCallback}
 *----------------------------------------------------------------------------*/
export function onEscape(node, callback) {
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      callback(e);
    }
  };
  window.addEventListener('keydown', handleKeydown);
  return {
    destroy() {
      window.removeEventListener('keydown', handleKeydown);
    }
  };
}
