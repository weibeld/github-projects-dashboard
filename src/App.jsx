// GitHub Projects Dashboard
// Uses React + dnd-kit + localStorage for PAT
// Stores project status in a JSON file in the same GitHub repo via GitHub REST API

import React, { useEffect, useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Column } from "./components/Column";
import { restrictToParentElement } from "@dnd-kit/modifiers";

const GITHUB_API = "https://api.github.com/graphql";
const STATUS_FILE_PATH = "data/statuses.json"; // path in your repo
const REPO_OWNER = "weibeld"; // change this
const REPO_NAME = "github-projects-dashboard"; // change this
const BRANCH = "main"; // or "master"

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("github_pat") || "");
  const [projects, setProjects] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [fileSha, setFileSha] = useState("");

  useEffect(() => {
    if (!token) {
      const input = prompt("Enter your GitHub Personal Access Token");
      if (input) {
        localStorage.setItem("github_pat", input);
        setToken(input);
      }
      return;
    }
    fetchProjects();
    fetchStatusFile();
  }, [token]);

  async function fetchProjects() {
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

    const res = await fetch(GITHUB_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    const nodes = data.data.viewer.projectsV2.nodes;
    setProjects(nodes);
  }

  async function fetchStatusFile() {
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${STATUS_FILE_PATH}?ref=${BRANCH}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return;
    const data = await res.json();
    const content = atob(data.content);
    setStatusMap(JSON.parse(content));
    setFileSha(data.sha);
  }

  function updateStatus(projectId, newStatus) {
    const newMap = { ...statusMap, [projectId]: newStatus };
    setStatusMap(newMap);
    saveStatusToFile(newMap);
  }

  async function saveStatusToFile(map) {
    const content = btoa(JSON.stringify(map, null, 2));
    await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${STATUS_FILE_PATH}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Update project statuses",
          content,
          sha: fileSha,
          branch: BRANCH,
        }),
      }
    );
  }

  const columns = ["todo", "doing", "done"];

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const newStatus = over.id;
        updateStatus(active.id, newStatus);
      }}
      modifiers={[restrictToParentElement]}
    >
      <div className="grid grid-cols-3 gap-4 p-4">
        {columns.map((status) => (
          <Column
            key={status}
            status={status}
            projects={projects.filter(
              (p) => (statusMap[p.id] || "todo") === status
            )}
          />
        ))}
      </div>
    </DndContext>
  );
}
