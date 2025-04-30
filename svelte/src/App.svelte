<script>
  import { onMount } from 'svelte';
  import Sortable from 'sortablejs';
  import { supabase } from './lib/supabaseClient';
  import Header from './components/Header.svelte';
  import Column from './components/Column.svelte';
  import ProjectCard from './components/ProjectCard.svelte';
  import { writable, get } from 'svelte/store';
  import { Loader } from 'lucide-svelte';

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
        /* TODO: ghostClass is not applied when adding it here */
        chosenClass: '_sortable-chosen',
        forceFallback: true,
        fallbackOnBody: true,
        onStart: () => {
          // Disable hover behaviour (e.g. underlining, pointer cursor)
          document.body.classList.add('_disable-pointer-events')
          // Enable 'cursor-grabbing' (Tailwind class) on entire page
          document.body.classList.add('cursor-grabbing');
          // Overwrite ProjectCard 'cursor: grab' to 'cursor: grabbing'
          document.body.classList.add('_cursor-grab-to-grabbing');
        },
        onEnd: (evt) => {
          document.body.classList.remove('_disable-pointer-events');
          document.body.classList.remove('cursor-grabbing');
          document.body.classList.remove('_cursor-grab-to-grabbing');
          const projectId = evt.item?.dataset?.id;
          if (projectId) {
            statusMap[projectId] = column;
            saveStatusMap();
          };
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
      console.log('session:', session);
      await fetchProjects();
    }
  });

  const getFilteredProjects = (column) =>
    projects.filter(p => (statusMap[p.id] || "todo") === column);
</script>

<main class="flex flex-col min-h-screen">
  <Header {session} onLogout={handleLogout}/>
  <div class="flex-1 flex flex-col items-center justify-center">
    {#if !session}
      <!--<button on:click={handleLogin} class="px-4 py-2 rounded shadow">Log in with GitHub</button>-->
      <button on:click={handleLogin} class="_button text-githubPrimaryTextColor px-4 py-2">Log in with GitHub</button>
    {:else}
      {#if projects.length === 0}
        <div class="flex flex-col items-center">
          <Loader class="w-8 h-8 animate-spin mb-2" />
          <p class="text-lg font-semibold text-githubSecondaryTextColor animate-pulse duration-100">Loading projects</p>
        </div>
      {:else}
        <div class="pt-4 pb-2 px-4 flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
          <Column title={columns[0]} projects={getFilteredProjects(columns[0])} bindRef={todoRef} />
          <Column title={columns[1]} projects={getFilteredProjects(columns[1])} bindRef={doingRef} />
          <Column title={columns[2]} projects={getFilteredProjects(columns[2])} bindRef={doneRef} />
        </div>
      {/if}
    {/if}
  </div>
</main>
