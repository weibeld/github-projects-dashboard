<!-- Note: double quotes break syntax highlighting in Vim -->
<script lang='ts'>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { Loader, Archive } from 'lucide-svelte';
  import Header from './components/Header.svelte';
  import ClosedColumnPane from './components/ClosedColumnPane.svelte';
  import LoginPage from './components/LoginPage.svelte';
  import LoadingScreen from './components/LoadingScreen.svelte';
  import MainContent from './components/MainContent.svelte';
  import { setupAuth, login, logout,
    isLoggingOut, isLoggingInInit, isLoggingInAfterOAuth, isLoggedIn } from './lib/auth';
  import { loadProjectsFromGitHub } from './lib/github.ts';
  import { metadata, createMetaView } from './lib/metadata';

  //let session = null;
  //let token = null;

  // Subscribe to the store
  /*let $metadata;
  metadata.subscribe(value => {
    $metadata = value;
  });*/

  /*
  const getFilteredProjects = (statusId: string) =>
    Object.values($metadata.projects).filter(p => p.status === statusId && !$metadata.views[$metadata.activeViewId].statusVisibility[statusId]);

  const getClosedProjects = () =>
    Object.values($metadata.projects).filter((p) => p.status === 'done');
 */

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

  /*const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        scopes: 'repo read:user read:project'
      }
    });
  };*/

  /*const handleLogout = async () => {
    await supabase.auth.signOut();
    session = null;
    token = null;
  };*/


  function handleDrop(statusId: string) {
    return (evt) => {
      const projectId = evt.item?.dataset?.id;
      if (projectId) {
        metadata.update(data => {
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
    setupAuth();
    // Execute only after isLoggedIn has been set to true in INITIAL_SESSION
    isLoggedIn.subscribe(async (value) => {
      if (value) {
        // TODO: hardcode default view in metadata default value
        if (get(metadata).views.length === 0) createMetaView();
        // TODO: implement loading indicator
        await loadProjectsFromGitHub();
      }
    });
  });

  /*$: if ($session) {
    handleLogin();
  }
  async function handleLogin() {
    if (get(metadata).views.length === 0) {
      createMetaView();
    }
    loadProjectsFromGitHub();
  }*/

    /*onAuthStateChange(session => {
      if (session) loadProjectsFromGitHub(getToken());
    });
    if (hasActiveSession()) {
      if (get(metadata).views.length === 0) createMetaView();
      await loadProjectsFromGitHub(getToken());
    }

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
      if (get(metadata).views.length === 0) createMetaView();
      console.log('metadata: ', get(metadata));
      await loadProjectsFromGitHub(token);
    }
  });*/

</script>

<main class="flex flex-col min-h-screen">
  <!-- TODO: onLogout not needed, Header can import isSession and logout itself -->
  <Header onLogout={logout}/>
  <div class="flex-1 flex flex-col items-center justify-center">
    {#if $isLoggingOut}
      <LoadingScreen message="Logging out" />
    {:else if $isLoggingInAfterOAuth}
      <LoadingScreen message="Logging in" />
    {:else if $isLoggedIn}
      <MainContent />
    {:else}
      <LoginPage />
    {/if}
  </div>
</main>
