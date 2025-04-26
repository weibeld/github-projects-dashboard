<script>
  export let session = null;
  export let onLogout;
</script>

<header class="bg-gray-100 border-b border-gray-300 px-4 py-2 flex justify-between items-center w-full">
  {#if session}
    <div class="text-sm text-gray-700">
      Signed in as <span class="font-semibold">{session.user.email}</span>
    </div>
    <button on:click={onLogout} class="text-sm text-red-600">
      Log out
    </button>
  {:else}
    <nav class="flex gap-4 text-sm text-gray-700">
      <a href="/" class="hover:underline">Home</a>
      <a href="/about" class="hover:underline">About</a>
      <a href="/contact" class="hover:underline">Contact</a>
    </nav>
  {/if}
</header>
