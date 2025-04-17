import React, { useEffect, useState } from "https://cdn.skypack.dev/react";
import ReactDOM from "https://cdn.skypack.dev/react-dom";
import { Column } from "./components/Column.js";

const statuses = ["todo", "doing", "done"];
const STATUS_FILE = "./statuses.json";

function App() {
  const [projects, setProjects] = useState([]);
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("gh_pat") || prompt("Enter GitHub PAT:");
    if (token) {
      localStorage.setItem("gh_pat", token);
      fetchProjects(token);
    }
    fetchStatusMap();
  }, []);

  async function fetchProjects(token) {
    const query = `
      query {
        viewer {
          projectsV2(first: 20) {
            nodes {
              id
              title
              url
            }
          }
        }
      }
    `;
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setProjects(data.data.viewer.projectsV2.nodes);
  }

  async function fetchStatusMap() {
    const res = await fetch(STATUS_FILE);
    const json = await res.json();
    setStatusMap(json);
  }

  function updateStatus(projectId, newStatus) {
    const newMap = { ...statusMap, [projectId]: newStatus };
    setStatusMap(newMap);
    saveStatusMap(newMap);
  }

  async function saveStatusMap(updatedMap) {
    const fileUrl = `https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/statuses.json`;
    const token = localStorage.getItem("gh_pat");

    const currentFile = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.json());

    const content = btoa(JSON.stringify(updatedMap, null, 2));
    await fetch(fileUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Update project status",
        content,
        sha: currentFile.sha,
      }),
    });
  }

  return React.createElement(
    "div",
    { className: "grid grid-cols-1 sm:grid-cols-3 gap-4" },
    statuses.map((status) =>
      React.createElement(Column, {
        key: status,
        status,
        projects: projects.filter((p) => (statusMap[p.id] || "todo") === status),
        onDrop: (projectId) => updateStatus(projectId, status),
      })
    )
  );
}

ReactDOM.render(
  React.createElement(App),
  document.getElementById("root")
);
