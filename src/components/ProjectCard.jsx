// ProjectCard.jsx
export function ProjectCard({ id, title, url }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => window.open(url, "_blank")}
      className="block bg-blue-100 hover:bg-blue-200 p-3 rounded-lg shadow mb-2 cursor-move"
    >
      {title}
    </div>
  );
}
