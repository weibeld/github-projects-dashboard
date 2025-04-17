// app.js
import { Column } from "./components/Column.js";

const { createElement: h, useEffect, useState } = React;
const { createRoot } = ReactDOM;

function App() {
  const [projects, setProjects] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("github_pat") || prompt("Enter GitHub Personal Access Token:");
      if (!token) return;
      localStorage.setItem("github_pat", token);

      try {
        const userRes = await fetch("https://api.github.com/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: `query { viewer { login }}` }),
        });
        const userData = await userRes.json();
        const login = userData.data.viewer.login;

        const projectRes = await fetch("https://api.github.com/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `query {
              user(login: "${login}") {
                projectsV2(first: 20) {
                  nodes {
                    id
                    title
                    url
                  }
                }
              }
            }`,
          }),
        });

        const projectData = await projectRes.json();
        const fetchedProjects = projectData.data.user.projectsV2.nodes;
        setProjects(fetchedProjects);

        const statusRes = await fetch("./statuses.json");
        const statusJson = await statusRes.json();
        setStatuses(statusJson);
      } catch (e) {
        console.error(e);
        setError("Failed to load GitHub Projects or statuses.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function updateProjectStatus(projectId, newStatus) {
    const updated = { ...statuses, [projectId]: newStatus };
    setStatuses(updated);

    fetch("./statuses.json", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated, null, 2),
    });
  }

  if (loading) return h("div", { className: "text-center mt-10" }, "Loading...");
  if (error) return h("div", { className: "text-red-500 text-center mt-10" }, error);

  const columns = ["todo", "doing", "done"];

  return h("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4" },
    columns.map(status =>
      h(Column, {
        key: status,
        status,
        projects: projects.filter(p => statuses[p.id] === status || (!statuses[p.id] && status === "todo")),
        onDrop: (id) => updateProjectStatus(id, status)
      })
    )
  );
}

const root = createRoot(document.getElementById("root"));
root.render(h(App));
