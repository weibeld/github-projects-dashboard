// ProjectCard.jsx
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function ProjectCard({ project }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <a
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      className="block bg-white rounded-xl shadow p-4 mb-2 hover:bg-gray-50 transition border border-gray-200"
    >
      <div className="font-semibold text-lg">{project.title}</div>
      <div className="text-sm text-gray-500">{project.url}</div>
    </a>
  );
}
