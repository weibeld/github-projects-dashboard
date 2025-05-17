<script>
  //export let session;
  export let onLogout;
  import { Github, Book, User, PanelsTopLeft, X, LogOut, Hourglass, Code} from 'lucide-svelte';
  import logoUrl from '../../public/logo.svg?url';
  import { onMount, onDestroy } from 'svelte';
  import { onEscape } from '../lib/onEscape.js';  // Svelte action
  import { disableScroll } from '../lib/disableScroll.js';  // Svelte action
  import Overlay from './Overlay.svelte';
  import Menu from './Menu.svelte';
  import { isLoggedIn, isLoggingInAfterOAuth } from '../lib/auth';

  let menuOpen = false;
  const closeMenu = () => {
    menuOpen = false;
  };

  /*$: user = session?.user ?? null;
  $: ghUsername = user?.user_metadata?.user_name;
  $: ghFullName = user?.user_metadata?.full_name;
  $: ghAvatarUrl = user?.user_metadata?.avatar_url;
  $: ghProfileUrl = `https://github.com/${ghUsername}`;
  $: ghProjectsUrl = `${ghProfileUrl}?tab=projects`;*/

  let ghUsername = null;
  let ghFullName = null;
  let ghAvatarUrl = null;
  let ghProfileUrl = null;
  let ghProjectsUrl = null;

  onMount(async () => {
    /*const ghUser = await getGitHubUser();
    ghUsername = ghUser.user_name;
    ghFullName = ghUser.full_name;
    ghAvatarUrl = ghUser.avatar_url;
    ghProfileUrl = `https://github.com/${ghUsername}`;
    ghProjectsUrl = `${ghProfileUrl}?tab=projects`;*/
  });

</script>

<header class="h-16 flex items-center justify-between px-4 bg-githubBgColor border-b border-githubBorderColor">
  <div class="text-xl font-semibold flex items-center gap-2">
    <img src={logoUrl} alt="Logo" class="w-8 h-8" /> GitHub Projects Dashboard
  </div>

  {#if $isLoggedIn || $isLoggingInAfterOAuth}
    <div class="flex items-center gap-3">
      <div class="flex items-center text gap-1">
        <a href="https://github.com" target="_blank" class="_box-link "><Github class="_icon" />GitHub</a>/
        <a href={ghProfileUrl} target="_blank" class="_box-link "><User class="_icon" />{ghUsername}</a>/
        <a href={ghProjectsUrl} target="_blank" class="_box-link "><PanelsTopLeft class="_icon" />Projects</a>
      </div>
      <button on:click={() => menuOpen = !menuOpen}>
        <img src={ghAvatarUrl} alt="Avatar" class="w-9 h-9 rounded-full border border-githubBorderColor" />
      </button>
      {#if menuOpen}
        <Menu {ghUsername} {ghFullName} {ghAvatarUrl} {onLogout} onClose={closeMenu} />
      {/if}
    </div>
  {:else}
    <nav class="text-githubPrimaryTextColor font-semibold flex gap-2">
      <a href="https://github.com/weibeld/github-projects-dashboard"  target="_blank" class="_box-link font-semibold"><Book class="_icon" />Docs</a>
      <a href="https://github.com/weibeld/github-projects-dashboard" target="_blank" class="_box-link font-semibold"><Github class="_icon" />GitHub</a>
    </nav>
  {/if}
</header>
