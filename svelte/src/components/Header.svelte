<script>
  export let session;
  export let onLogout;
  import { Github, Book, User, PanelsTopLeft } from 'lucide-svelte';
  import logoUrl from '../assets/logo.svg?url';
  import { clickOutside } from '../lib/clickOutside.js'

  let menuOpen = false;
  const handleClickOutside = () => {
    console.log("Clicked outside");
    menuOpen = false;
  };

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
    <div class="flex items-center gap-3" use:clickOutside={handleClickOutside}>
      <div class="flex items-center text gap-1">
        <a href="https://github.com" target="_blank" class="_box-link "><Github class="_icon" />GitHub</a>/
        <a href={ghProfileUrl} target="_blank" class="_box-link "><User class="_icon" />{ghUsername}</a>/
        <a href={ghProjectsUrl} target="_blank" class="_box-link "><PanelsTopLeft class="_icon" />Projects</a>
      </div>
      <button on:click={() => menuOpen = !menuOpen}>
        <img src={ghAvatarUrl} alt="Avatar" class="w-9 h-9 rounded-full border border-githubBorderColor" />
      </button>

      {#if menuOpen}
        <div class="fixed top-0 right-0 mt-16 mr-4 w-60 bg-white rounded-md shadow-xl z-50 animate-slide-in">
          <a href={ghProfileUrl} target="_blank" on:click={() => menuOpen = false} class="block px-4 py-2 hover:bg-githubButtonHoverBgColor">GitHub Profile</a>
          <a href={ghProjectsUrl} target="_blank" on:click={() => menuOpen = false} class="block px-4 py-2 hover:bg-githubButtonHoverBgColor">GitHub Projects</a>
          <button on:click={() => {menuOpen = false; onLogout();}} class="block w-full text-left px-4 py-2 hover:bg-githubRedHoverBgColor hover:text-githubRedColor">Logout</button>
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
