<script>
  export let session;
  export let onLogout;
  import { Github, Book } from 'lucide-svelte';
  import logoUrl from '../assets/logo.svg?url';
  import '../lib/clickOutside.js'

  let menuOpen = false;
  function closeMenu() {
    menuOpen = false;
  }

  $: user = session?.user ?? null;
  $: ghUsername = user?.user_metadata?.user_name;
  $: ghAvatarUrl = user?.user_metadata?.avatar_url;
  $: ghProfileUrl = `https://github.com/${ghUsername}`;
  $: ghProjectsUrl = `${ghProfileUrl}?tab=projects`;

</script>

<header class="h-16 flex items-center justify-between px-4 bg-githubBgColor border-b border-githubBorderColor">
  <div class="text-xl font-semibold flex items-center gap-2">
    <img src={logoUrl} alt="Logo" class="w-8 h-8" /> GitHub Projects Dashboard
  </div>

  {#if session}
    <div class="relative" use:clickOutside={closeMenu}>
      <button on:click={() => menuOpen = !menuOpen} class="flex items-center gap-3">
        <span class="text-sm font-bold">{ghUsername}</span>
        {#if ghAvatarUrl}<img src={ghAvatarUrl} alt="Avatar" class="w-8 h-8 rounded-full" />{/if}
      </button>

      {#if menuOpen}
        <div class="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md p-2">
          <a href={ghProfileUrl} target="_blank" class="block px-4 py-2 hover:bg-githubButtonHoverBgColor">GitHub Profile</a>
          <a href={ghProjectsUrl} target="_blank" class="block px-4 py-2 hover:bg-githubButtonHoverBgColor">GitHub Projects</a>
          <button on:click={onLogout} class="block w-full text-left px-4 py-2 hover:bg-githubRedHoverBgColor hover:text-githubRedColor">Logout</button>
        </div>
      {/if}
    </div>
  {:else}
    <nav class="text-githubPrimaryTextColor font-semibold flex gap-2">
      <a href="https://github.com/weibeld/github-projects-dashboard"  target="_blank" class="_box-link font-semibold"><Book class="_icon" />Docs</a>
      <a href="https://github.com/weibeld/github-projects-dashboard" target="_blank" class="_box-link font-semibold"><Github class="_icon" />GitHub</a>
    </nav>
  {/if}
</header>
