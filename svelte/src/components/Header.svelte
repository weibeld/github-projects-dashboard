<script>
  export let session;
  export let onLogout;
  import { Github, Book, User, PanelsTopLeft, X, LogOut, Hourglass, Code} from 'lucide-svelte';
  import logoUrl from '../../public/logo.svg?url';
  import { onMount, onDestroy } from 'svelte';
  import { onEscape } from '../lib/onEscape.js';  // Svelte action
  import { disableScroll } from '../lib/disableScroll.js';  // Svelte action
  import Overlay from './Overlay.svelte';

  let menuOpen = false;
  const closeMenu = () => {
    menuOpen = false;
  };

  $: user = session?.user ?? null;
  $: ghUsername = user?.user_metadata?.user_name;
  $: ghFullName = user?.user_metadata?.full_name;
  $: ghAvatarUrl = user?.user_metadata?.avatar_url;
  $: ghProfileUrl = `https://github.com/${ghUsername}`;
  $: ghProjectsUrl = `${ghProfileUrl}?tab=projects`;

</script>

<header class="h-16 flex items-center justify-between px-4 bg-githubBgColor border-b border-githubBorderColor">
  <div class="text-xl font-semibold flex items-center gap-2">
    <img src={logoUrl} alt="Logo" class="w-8 h-8" /> GitHub Projects Dashboard
  </div>

  {#if session}
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
        <!-- Overlay shading rest of page when menu is open -->
        <Overlay onClick={closeMenu} />
        <!-- Menu container -->
        <div use:onEscape={closeMenu} use:disableScroll class="fixed top-0 right-0 w-80 bg-white rounded-l-xl shadow-xl z-50 animate-slide-in-right overflow-hidden p-4">
          <!-- Menu header -->
          <div class="flex items-center justify-between mb-4 relative">
            <!-- Left side of menu header -->
            <div class="flex items-center gap-2">
              <img src={ghAvatarUrl} alt="Avatar" class="w-9 h-9 rounded-full border border-githubBorderColor" />
              <div class="flex flex-col text-sm leading-tight">
                <span class="font-bold text-githubPrimaryTextColor">{ghUsername}</span>
                <span class="text-githubSecondaryTextColor">{ghFullName}</span>
              </div>
            </div>
            <!-- Right side of menu header (close button) -->
            <button on:click={() => (menuOpen = false)} aria-label="Close menu" class="text-githubSecondaryTextColor hover:bg-githubButtonHoverBgColor p-2.5 rounded-lg absolute top-0 right-0 ">
              <X class="_icon" />
            </button>
          </div>
          <!-- Menu items -->
          <div>
            <a href="https://github.com/weibeld/github-projects-dashboard" target="_blank" on:click={() => menuOpen = false} class="_box-link p-2 gap-2 mb-1">
              <Book class="_icon" />
              Docs
            </a>
            <a href="https://github.com/weibeld/github-projects-dashboard" target="_blank" on:click={() => menuOpen = false} class="_box-link p-2 gap-2 mb-1">
              <Code class="_icon" />
              Code
            </a>
            <a href="javascript:void(0)" on:click={() => {menuOpen = false; onLogout();}} class="_box-link p-2 gap-2 mb-1">
              <Hourglass class="_icon" />
              Log out (temporary)
            </a>
            <hr class="border-t border-1 border-githubDividerColor mt-2 mb-2" />
            <div class="flex items-center p-2 pb-1 gap-2 text-githubSecondaryTextColor">
              <div>
                <LogOut class="_icon" />
              </div>
              <div class="text-xs leading-tight text-githubSecondaryTextColor p-0">
                To sign out, please log out from <a href="https://github.com/" target="_blank" class="_classic-link text-githubActionColor" on:click={() => menuOpen = false}>GitHub</a> in this browser.
              </div>
            </div>
          </div>
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
