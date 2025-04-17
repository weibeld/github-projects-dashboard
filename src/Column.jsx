// Column.jsx
import React from "react";
import { useDroppable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ProjectCard } from "./ProjectCard";

export function Column({ status, projects }) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div className="bg-gray-100 rounded-2xl p-4 shadow-md" ref={setNodeRef}>
      <h2 className="text-xl font-bold mb-4 capitalize">{status}</h2>
      <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </SortableContext>
    </div>
  );
}
