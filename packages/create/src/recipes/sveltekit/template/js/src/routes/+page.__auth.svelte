<script>
  export let data;
</script>

<main>
  <h1>Welcome to SvelteKit</h1>
  <p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
  <p>
    {#if data.isSignedIn}
      You are signed in.
    {:else}
      You are not signed in.
    {/if}
  </p>
</main>
