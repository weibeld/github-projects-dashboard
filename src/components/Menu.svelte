<script>
  import { X, Book, Code, Hourglass, LogOut } from 'lucide-svelte';
  import { onEscape } from '../lib/onEscape.js';
  import { disableScroll } from '../lib/disableScroll.js';
  import Overlay from './Overlay.svelte';
  import { logout, githubUserInfo } from '../lib/auth';
  export let onLogout;
  export let onClose;
</script>

<Overlay onClick={onClose} />
<div use:onEscape={onClose} use:disableScroll class="_slide-in-container top-0 w-80 p-4">
  <!-- Menu header -->
  <div class="flex items-center justify-between mb-4 relative">
    <div class="flex items-center gap-2">
      <img src={$githubUserInfo.avatarUrl} alt="Avatar" class="w-9 h-9 rounded-full border border-githubBorderColor" />
      <div class="flex flex-col text-sm leading-tight">
        <span class="font-bold text-githubPrimaryTextColor">{$githubUserInfo.userName}</span>
        <span class="text-githubSecondaryTextColor">{$githubUserInfo.fullName}</span>
      </div>
    </div>
    <button on:click={onClose} aria-label="Close menu" class="text-githubSecondaryTextColor hover:bg-githubButtonHoverBgColor p-2.5 rounded-lg absolute top-0 right-0">
      <X class="_icon" />
    </button>
  </div>
  <!-- Menu items -->
  <a href="https://github.com/weibeld/github-projects-dashboard" target="_blank" on:click={onClose} class="_box-link p-2 gap-2 mb-1">
    <Book class="_icon" /> Docs
  </a>
  <a href="https://github.com/weibeld/github-projects-dashboard" target="_blank" on:click={onClose} class="_box-link p-2 gap-2 mb-1">
    <Code class="_icon" /> Code
  </a>

  <hr class="border-t border-1 border-githubDividerColor mt-2 mb-2" />

  <!-- TODO: use imported 'logout' from auth.ts -->
  <button on:click={() => { onClose(); onLogout(); }} class="_box-link p-2 gap-2 w-full hover:text-githubRedColor hover:bg-githubRedHoverBgColor">
    <LogOut class="_icon" /> Log out
  </button>
  <!--<div class="text-xs leading-tight text-right">
    To permanently sign out, also sign out from <a href="https://github.com/" target="_blank" class="_classic-link text-githubActionColor" on:click={onClose}>GitHub</a> in this browser.
  </div>-->
</div>
