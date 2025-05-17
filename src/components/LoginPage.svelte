<script>
  import { login } from '../lib/auth';
  import { isLoggingInInit } from '../lib/auth';
</script>


<button on:click={login} class="_button text-githubPrimaryTextColor px-4 py-2 w-[11em] flex justify-center">
  {#if !$isLoggingInInit}
    Log in with GitHub
  {:else}
    <span class="animate-pulse0">
       Logging in...
     </span>
  {/if}
</button>
