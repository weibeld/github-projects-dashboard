<script>
  import { onMount } from 'svelte';
  import { supabase } from './supabaseClient';

  let session = null;
  let token = null;
  let projects = [];
  let statusMap = {}; // { projectId: "todo" | "doing" | "done" }

  const columns = ["todo", "doing", "done"];

  const GITHUB_GRAPHQL = "https://api.github.com/graphql";

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        scopes: 'repo read:user read:project'
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    session = null;
    token = null;
  };

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
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    const json = await res.json();
    projects = json.data.viewer.projectsV2.nodes;
    loadStatusMap();
  };

  const loadStatusMap = () => {
    const saved = localStorage.getItem("projectStatuses");
    if (saved) {
      statusMap = JSON.parse(saved);
    }
  };

  const saveStatusMap = () => {
    localStorage.setItem("projectStatuses", JSON.stringify(statusMap));
  };

  const updateStatus = (projectId, newStatus) => {
    statusMap = { ...statusMap, [projectId]: newStatus };
    saveStatusMap();
  };

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    session = data.session;

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session = newSession;
      token = newSession?.provider_token;
      if (token) fetchProjects();
    });

    if (session) {
      token = session.provider_token;
      await fetchProjects();
    }
  });
</script>

<main class="p-4 text-gray-800">
  {#if !session}
    <button on:click={handleLogin} class="px-4 py-2 rounded shadow">
      Log in with GitHub
    </button>
  {:else}
    <div class="mb-4 flex justify-between items-center">
      <p class="text-sm">Signed in as {session.user.email}</p>
      <button on:click={handleLogout} class="text-sm text-red-600">Log out</button>
    </div>
    {#if projects.length === 0}
      <p>Loading projects...</p>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {#each columns as column}
          <div class="bg-gray-100 p-3 rounded shadow">
            <h2 class="text-lg font-semibold mb-2 capitalize">{column}</h2>
            <div class="space-y-2">
              {#each projects.filter(p => (statusMap[p.id] || "todo") === column) as project}
                <div class="p-2 bg-white rounded border shadow-sm">
                  <a href={project.url} target="_blank" class="hover:underline text-blue-600">
                    {project.title}
                  </a>
                  <div class="mt-1 text-xs text-gray-400">ID: {project.id}</div>

                  <div class="mt-2 space-x-1 text-xs">
                    {#each columns.filter(c => c !== column) as c}
                      <button
                        class="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                        on:click={() => updateStatus(project.id, c)}
                      >
                        Move to {c}
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</main>
