import React, { useEffect, useState, useRef } from "react";
import { useUser, SignInButton, SignOutButton } from "@clerk/clerk-react";
import ReactDOM from "react-dom/client";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Column } from "./components/Column";
import { debounce } from "./utils/debounce";
import "../index.css";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const GITHUB_REST = "https://api.github.com/repos/weibeld/github-projects-dashboard/contents/statuses.json";
const GITHUB_BRANCH = "main";

function App() {
  const [projects, setProjects] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [fileSha, setFileSha] = useState("");
  const [saving, setSaving] = useState(false);

  const [accessToken, setAccessToken] = useState(null);

  //const token = useRef(localStorage.getItem("gh_pat") || "");
  //const token = await user.getToken({ provider: "github" });

  const { isSignedIn, user } = useUser();
  if (!isSignedIn) {
    return (
      <div className="p-4">
        <SignInButton mode="modal" />
      </div>
    );
  }

  useEffect(() => {
    if (user) {
      (async () => {
        const token = await user.getToken({ provider: "github" });
        setAccessToken(token);
      })();
    }
    if (user && accessToken) {
      fetchProjects();
      fetchStatuses();
    }
  }, [user, accessToken]);

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
        Authorization: `Bearer ${accessToken.current}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setProjects(data.data.viewer.projectsV2.nodes);
  };

  const fetchStatuses = async () => {
    const res = await fetch(GITHUB_REST, {
      headers: { Authorization: `Bearer ${accessToken.current}` },
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
          Authorization: `Bearer ${accessToken.current}`,
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
      <div className="text-sm text-gray-500 mb-2 flex justify-between items-center">
        <span>Welcome, {user.primaryEmailAddress?.emailAddress}</span>
        <SignOutButton />
      </div>
      <div className="text-sm text-gray-500 mb-2">
        {saving ? "Saving..." : "All changes saved."}
      </div>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over && active.id && over.id && active.id !== over.id) {
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
              onDrop={(projectId) => updateStatus(projectId, status)}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

export default App;
