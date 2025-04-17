// components/Column.js
import { ProjectCard } from "./ProjectCard.js";

const { createElement: h } = React;
import { DndContext, useDroppable } from "https://cdn.skypack.dev/@dnd-kit/core";

export function Column({ status, projects, onDrop }) {
  const { setNodeRef } = useDroppable({ id: status });

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id && over.id === status) {
      onDrop(active.id);
    }
  }

  return h(DndContext, { onDragEnd: handleDragEnd },
    h("div", {
      ref: setNodeRef,
      className: "bg-white rounded-xl shadow p-4 min-h-[300px]"
    },
      h("h2", { className: "text-xl font-bold capitalize mb-4" }, status),
      projects.map(project =>
        h(ProjectCard, {
          key: project.id,
          id: project.id,
          title: project.title,
          url: project.url
        })
      )
    )
  );
}
