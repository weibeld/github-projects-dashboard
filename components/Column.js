// components/Column.js
import React from "https://cdn.skypack.dev/react";
import { DndContext, useDroppable } from "https://cdn.skypack.dev/@dnd-kit/core";
import { ProjectCard } from "./ProjectCard.js";

export function Column({ status, projects, onDrop }) {
  const { setNodeRef } = useDroppable({ id: status });

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id && over.id === status) {
      onDrop(active.id);
    }
  }

  return React.createElement(
    DndContext,
    { onDragEnd: handleDragEnd },
    React.createElement(
      "div",
      {
        ref: setNodeRef,
        className: "bg-white rounded-xl shadow p-4 min-h-[300px]",
      },
      [
        React.createElement(
          "h2",
          {
            key: "header",
            className: "text-xl font-bold capitalize mb-4",
          },
          status
        ),
        ...projects.map((project) =>
          React.createElement(ProjectCard, {
            key: project.id,
            id: project.id,
            title: project.title,
            url: project.url,
          })
        ),
      ]
    )
  );
}
