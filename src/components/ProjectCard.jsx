// src/components/ProjectCard.jsx
import React from "react";
import { useDraggable } from "@dnd-kit/core";

export function ProjectCard({ id, title, url }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="block bg-blue-100 hover:bg-blue-200 p-3 rounded-lg shadow mb-2 cursor-move"
    >
      {title}
    </a>
  );
}
