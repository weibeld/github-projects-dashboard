// src/components/Column.jsx
import React from "react";
import { DndContext, useDroppable } from "@dnd-kit/core";
import { ProjectCard } from "./ProjectCard";

export function Column({ status, projects, onDrop }) {
  const { setNodeRef } = useDroppable({ id: status });

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id && over.id === status) {
      onDrop(active.id);
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div ref={setNodeRef} className="bg-white rounded-xl shadow p-4 min-h-[300px]">
        <h2 className="text-xl font-bold capitalize mb-4">{status}</h2>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            id={project.id}
            title={project.title}
            url={project.url}
          />
        ))}
      </div>
    </DndContext>
  );
}
