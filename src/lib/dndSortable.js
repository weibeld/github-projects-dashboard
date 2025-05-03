import Sortable from 'sortablejs';

export function dndSortable(node, {
  group = 'columns',
  chosenClass = '_sortable-chosen',
  ghostClass = '',
  disabled = false,
  onDrop = () => {}
} = {}) {
  if (!node || disabled) return;

  const sortable = Sortable.create(node, {
    group,
    animation: 150,
    swapThreshold: 0.5,
    chosenClass,
    ghostClass,
    forceFallback: true,
    fallbackOnBody: true,
    onStart: () => {
      // Disable hover behaviour (e.g. underlining, pointer cursor)
      document.body.classList.add('_disable-pointer-events');
      // Enable 'cursor-grabbing' (Tailwind class) on entire page
      document.body.classList.add('cursor-grabbing');
      // Overwrite ProjectCard 'cursor: grab' to 'cursor: grabbing'
      document.body.classList.add('_cursor-grab-to-grabbing');
    },
    onEnd: (evt) => {
      document.body.classList.remove('_disable-pointer-events');
      document.body.classList.remove('cursor-grabbing');
      document.body.classList.remove('_cursor-grab-to-grabbing');
      onDrop(evt);
    }
  });

  return {
    destroy() {
      sortable.destroy();
    }
  };
}
