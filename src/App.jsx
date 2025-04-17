// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Column } from "./components/Column";
import { debounce } from "./utils/debounce";
import "../index.css";  // Tailwind and custom styles

const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const GITHUB_REST = "https://api.github.com/repos/weibeld/github-projects-dashboard/contents/statuses.json";
const GITHUB_BRANCH = "main";

function App() {
  const [projects, setProjects] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [fileSha, setFileSha] = useState("");
  const [saving, setSaving] = useState(false);

  const token = useRef(localStorage.getItem("gh_pat") || "");

  useEffect(() => {
    if (!token.current) {
      token.current = prompt("Enter your GitHub PAT:");
      localStorage.setItem("gh_pat", token.current);
    }
    fetchProjects();
    fetchStatuses();
  }, []);

  const fetchProjects = async () => {
    const query = `{
      viewer {
        projectsV2(first: 50) {
          nodes {
            id
            title
            url
          }
        }
      }
    }`;
    const res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.current}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setProjects(data.data.viewer.projectsV2.nodes);
  };

  const fetchStatuses = async () => {
    const res = await fetch(GITHUB_REST, {
      headers: { Authorization: `Bearer ${token.current}` },
    });
    const json = await res.json();
    setStatusMap(JSON.parse(atob(json.content)));
    setFileSha(json.sha);
  };

  const debouncedSave = useRef(
    debounce(async (map) => {
      setSaving(true);
      const content = btoa(JSON.stringify(map, null, 2));
      await fetch(GITHUB_REST, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token.current}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Update statuses",
          content,
          sha: fileSha,
          branch: GITHUB_BRANCH,
        }),
      });
      setSaving(false);
    }, 1500)
  ).current;

  const updateStatus = (projectId, newStatus) => {
    const updated = { ...statusMap, [projectId]: newStatus };
    setStatusMap(updated);
    debouncedSave(updated);
  };

  const columns = ["todo", "doing", "done"];

  return (
    <div className="p-4">
      <div className="text-sm text-gray-500 mb-2">
        {saving ? "Saving..." : "All changes saved."}
      </div>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (active && over && active.id !== over.id) {
            updateStatus(active.id, over.id);
          }
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {columns.map((status) => (
            <Column
              key={status}
              status={status}
              projects={projects.filter(
                (p) => (statusMap[p.id] || "todo") === status
              )}
              onDrop={updateStatus}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
