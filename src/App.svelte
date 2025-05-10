<!-- Note: double quotes break syntax highlighting in Vim -->
<script lang='ts'>
  import { onMount } from 'svelte';
  //import Sortable from 'sortablejs';
  import { supabase } from './lib/supabaseClient';
  import { tooltip } from './lib/tooltip';  // Svelte action
  import Header from './components/Header.svelte';
  import Column from './components/Column.svelte';
  import ClosedColumnPane from './components/ClosedColumnPane.svelte';
  import { Loader, Archive } from 'lucide-svelte';
  import { appData } from './lib/appDataStore';
  import type { Project } from './lib/types';
  import { get } from 'svelte/store';
  import { loadProjectsFromGitHub } from './lib/github.ts';

  let session = null;
  let token = null;

  // Subscribe to the store
  /*let $appData;
  appData.subscribe(value => {
    $appData = value;
  });*/

  const getFilteredProjects = (statusId: string) =>
    Object.values($appData.projects).filter(p => p.status === statusId && !$appData.views[$appData.activeViewId].statusVisibility[statusId]);

  const getClosedProjects = () =>
    Object.values($appData.projects).filter((p) => p.status === 'done');

  /*#############*/
  /*
  const getFilteredProjects = (column) =>
  projects.filter(p => (statusMap[p.id] || "todo") === column);

  const getClosedProjects = () =>
    projects.filter((p) => p.closed || statusMap[p.id] === 'done');
  */
  /*#############*/


  /*#############*/
  /*
  let todoRef = writable(null);
  let doingRef = writable(null);
  let doneRef = writable(null);
  */
  /*#############*/

  let closedPaneOpen = false;

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


  function handleDrop(statusId: string) {
    return (evt) => {
      const projectId = evt.item?.dataset?.id;
      if (projectId) {
        appData.update(data => {
          const project = data.projects[projectId];
          if (project) {
            project.status = statusId;
          }
          return data;
        });
      }
    };
  }

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    session = data.session;

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session = newSession;
      token = newSession?.provider_token;
      if (token) loadProjectsFromGitHub(token);
    });

    if (session) {
      token = session.provider_token;
      console.log('session:', session);
      await loadProjectsFromGitHub(token);
    }
  });

</script>

<main class="flex flex-col min-h-screen">
  <Header {session} onLogout={handleLogout}/>
  <div class="flex-1 flex flex-col items-center justify-center">
    {#if !session}
      <!--<button on:click={handleLogin} class="px-4 py-2 rounded shadow">Log in with GitHub</button>-->
      <button on:click={handleLogin} class="_button text-githubPrimaryTextColor px-4 py-2">Log in with GitHub</button>
    {:else}
      {#if !$appData}
        <div class="flex flex-col items-center">
          <Loader class="w-8 h-8 animate-spin mb-2" />
          <p class="text-lg font-semibold text-githubSecondaryTextColor animate-pulse duration-100">Loading projects</p>
        </div>
      {:else}
        {#each $appData.statuses as statusId (statusId)}
          {#if !$appData.views[$appData.activeViewId].statusVisibility[statusId]}
            <Column
              title={statusId}
              projects={getFilteredProjects(statusId)}
              dndOnDrop={handleDrop(statusId)}
            />
          {/if}
        {/each}
        <!--<div class="flex-1 grid grid-cols-1 sm:grid-cols-2 w-full pt-4 pb-2 px-4 gap-4">
          <Column title={columns[0]} projects={getFilteredProjects(columns[0])} bindRef={todoRef} dndOnDrop={handleDrop(columns[0])} />
          <Column title={columns[1]} projects={getFilteredProjects(columns[1])} bindRef={doingRef} dndOnDrop={handleDrop(columns[1])} />
        </div>-->
        <button use:tooltip={{ text: "Closed projects", align: "right" }} on:click={() => closedPaneOpen = !closedPaneOpen} class="_button p-2 absolute right-0 top-16 mt-4 z-30" aria-label="Toggle closed pane">
          <Archive class="_icon" />
        </button>
        {#if closedPaneOpen}
          <ClosedColumnPane onClose={() => closedPaneOpen = false} projects={getClosedProjects()} dndOnDrop={handleDrop(columns[2])} />
        {/if}
      {/if}
    {/if}
  </div>
</main>
