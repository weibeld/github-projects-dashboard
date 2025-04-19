import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { Column } from "./components/Column";
import { debounce } from "./utils/debounce";
import { supabase } from "./supabaseClient";
import "../index.css";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";
const GITHUB_REST_STATUS = "https://api.github.com/repos/weibeld/github-projects-dashboard/contents/statuses.json";
const GITHUB_REST_USER = "https://api.github.com/user";
const GITHUB_BRANCH = "main";

const handleLogin = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      // Supports both local and production deployment
      redirectTo: window.location.origin + window.location.pathname,
      scopes: 'repo read:user read:project'
    }
  });

  if (error) console.error('Login error:', error);
};

function App() {
  const [projects, setProjects] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [fileSha, setFileSha] = useState("");
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState(null);
  const [githubUsername, setGithubUsername] = useState(null);
  const [githubAvatar, setGithubAvatar] = useState(null);
  const [githubProfileUrl, setGithubProfileUrl] = useState(null);
  //const token = session?.provider_token;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const fetchProjects = async (token) => {
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
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setProjects(data.data.viewer.projectsV2.nodes);
  };

  const fetchStatuses = async (token) => {
    const res = await fetch(GITHUB_REST_STATUS, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setStatusMap(JSON.parse(atob(json.content)));
    setFileSha(json.sha);
  };

  const fetchGitHubProfile = async (token) => {
    const res = await fetch(GITHUB_REST_USER, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    const data = await res.json();
    setGithubUsername(data.login);
    setGithubAvatar(data.avatar_url);
    setGithubProfileUrl(data.html_url);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => { setSession(session); }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.provider_token) return;
    const token = session.provider_token;
    console.log("GitHub Token:", token);
    fetchGitHubProfile(token);
    fetchProjects(token);
    fetchStatuses(token);
  }, [session]);


//  if (!session) {
//    return <button onClick={handleLogin}>Log in with GitHub</button>;
//  }
  //console.log("GitHub Token:", token);

  const debouncedSave = useRef(
    debounce(async (map, token) => {
      setSaving(true);
      const content = btoa(JSON.stringify(map, null, 2));
      await fetch(GITHUB_REST_STATUS, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
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
    debouncedSave(updated, session?.provider_token);
  };

  const columns = ["todo", "doing", "done"];

  return (
    <div className="p-4">
      {!session ? (
        <button onClick={handleLogin}>Log in with GitHub</button>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <a
                href={`${githubProfileUrl}?tab=projects`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded"
              > 
                <b>{githubUsername}</b>
              </a>
            </div>
            <div className="flex justify-between items-center">
              <button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded"
              >
                Log out
              </button>
              {githubAvatar && githubProfileUrl && (
                <a href={githubProfileUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={githubAvatar}
                    alt="GitHub Avatar"
                    className="w-8 h-8 rounded-full hover:ring-2 hover:ring-gray-400 transition"
                  />
                </a>
              )}
            </div>
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
        </>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
