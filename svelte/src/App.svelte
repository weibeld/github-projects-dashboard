<script>
  import { onMount } from 'svelte';
  import Sortable from 'sortablejs';
  import { supabase } from './supabaseClient';
  import ProjectCard from './components/ProjectCard.svelte';

  let session = null;
  let token = null;
  let projects = [];
  let statusMap = {}; // { projectId: "todo" | "doing" | "done" }

  const columns = ["todo", "doing", "done"];

  let todoRef, doingRef, doneRef;

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
    setupSortables();
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

  function setupSortables() {
    const refs = { todo: todoRef, doing: doingRef, done: doneRef };

    for (const column of columns) {
      const el = refs[column];
      if (!el) continue;

      Sortable.create(el, {
        group: 'columns',
        animation: 150,
        swapThreshold: 0.5,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: (evt) => {
          const projectId = evt.item?.dataset?.id;
          if (projectId) {
            statusMap[projectId] = column;
            saveStatusMap();
          }
        }
      });
    }
  }

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

  const getFilteredProjects = (column) =>
    projects.filter(p => (statusMap[p.id] || "todo") === column);
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
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
        <div class="bg-gray-100 p-3 rounded shadow flex flex-col">
          <h2 class="text-lg font-semibold mb-2 capitalize">todo</h2>
          <div class="space-y-2 min-h-[50px]" bind:this={todoRef}>
            {#each getFilteredProjects("todo") as project (project.id)}
              <ProjectCard {project} />
            {/each}
          </div>
        </div>

        <div class="bg-gray-100 p-3 rounded shadow flex flex-col">
          <h2 class="text-lg font-semibold mb-2 capitalize">doing</h2>
          <div class="space-y-2 min-h-[50px]" bind:this={doingRef}>
            {#each getFilteredProjects("doing") as project (project.id)}
              <ProjectCard {project} />
            {/each}
          </div>
        </div>

        <div class="bg-gray-100 p-3 rounded shadow flex flex-col">
          <h2 class="text-lg font-semibold mb-2 capitalize">done</h2>
          <div class="space-y-2 min-h-[50px]" bind:this={doneRef}>
            {#each getFilteredProjects("done") as project (project.id)}
              <ProjectCard {project} />
            {/each}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</main>
