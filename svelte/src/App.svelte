<script>
  import { onMount } from 'svelte';
  import Sortable from 'sortablejs';
  import { supabase } from './supabaseClient';
  import Header from './components/Header.svelte';
  import Column from './components/Column.svelte';
  import ProjectCard from './components/ProjectCard.svelte';
  import { writable, get } from 'svelte/store';

  let session = null;
  let token = null;
  let projects = [];
  let statusMap = {}; // { projectId: "todo" | "doing" | "done" }

  const columns = ["todo", "doing", "done"];

  let todoRef = writable(null);
  let doingRef = writable(null);
  let doneRef = writable(null);

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
    // TODO: fetching repositories always returns an empty list
    const query = `{
      viewer {
        projectsV2(first: 50) {
          nodes {
            id
            number
            title
            url
            closed
            createdAt
            updatedAt
            closedAt
            public
            shortDescription
            items {
              totalCount
            }
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
    console.log("GitHub response:", json);
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
      const refs = {
        todo: get(todoRef),
        doing: get(doingRef),
        done: get(doneRef)
      };

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

<Header {session} onLogout={handleLogout} />
<main class="p-4 text-gray-800">
  {#if !session}
    <!-- TODO: centre vertically in page -->
    <div class="flex items-center justify-center">
      <button on:click={handleLogin} class="px-4 py-2 rounded shadow">
        Log in with GitHub
      </button>
    </div>
  {:else}
    {#if projects.length === 0}
      <!-- TODO: centre vertically in page -->
      <div class="flex items-center justify-center">
        <p class="text-gray-500 text-lg">Loading projects...</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
        <Column title={columns[0]} projects={getFilteredProjects(columns[0])} bindRef={todoRef} />
        <Column title={columns[1]} projects={getFilteredProjects(columns[1])} bindRef={doingRef} />
        <Column title={columns[2]} projects={getFilteredProjects(columns[2])} bindRef={doneRef} />
      </div>
    {/if}
  {/if}
</main>
