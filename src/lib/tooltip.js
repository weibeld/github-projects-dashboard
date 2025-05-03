/*----------------------------------------------------------------------------*
* Svelte action: 'tooltip'
* Shows a tooltip below the hovered element.
* Usage:
*   use:tooltip={{ text: "...", align: "left|center|right|" }}
*----------------------------------------------------------------------------*/
import { mount, unmount } from 'svelte';
import Tooltip from '../components/Tooltip.svelte';

export function tooltip(node, { text, align = 'center' }) {
  let tooltipComponent;

  function showTooltip() {
    const rect = node.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 4; // 8px offset below the element
    let left;

    if (align === 'left') {
      left = rect.left + window.scrollX;
    } else if (align === 'right') {
      left = rect.right + window.scrollX;
    } else {
      // center by default
      left = rect.left + window.scrollX + rect.width / 2;
    }

    tooltipComponent = mount(Tooltip, {
      target: document.body,
      props: { text, top, left, align },
      intro: true
    });
  }

  function hideTooltip() {
    if (tooltipComponent) {
      unmount(tooltipComponent);
      tooltipComponent = null;
    }
  }

  node.addEventListener('mouseenter', showTooltip);
  node.addEventListener('mouseleave', hideTooltip);

  return {
    destroy() {
      node.removeEventListener('mouseenter', showTooltip);
      node.removeEventListener('mouseleave', hideTooltip);
      node.addEventListener('click', hideTooltip);
      hideTooltip();
    }
  };
}
